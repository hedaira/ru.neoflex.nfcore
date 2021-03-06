package ru.neoflex.nfcore.masterdata.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.db.record.OIdentifiable;
import com.orientechnologies.orient.core.id.ORID;
import com.orientechnologies.orient.core.index.OIndex;
import com.orientechnologies.orient.core.index.OIndexDefinition;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import ru.neoflex.nfcore.masterdata.utils.OEntity;

import java.io.*;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MasterdataExporter {
    private final static Pattern ridPattern = Pattern.compile("^#([0-9]+):([0-9]+)$");
    private final static Log logger = LogFactory.getLog(MasterdataExporter.class);
    MasterdataProvider provider;

    MasterdataExporter(MasterdataProvider provider) {
        this.provider = provider;
    }

    public void exportSQL(String sql, OutputStream os) throws IOException {
        try (OutputStreamWriter writer = new OutputStreamWriter(os, "utf-8");) {
            exportSQL(sql, s -> {
                try {
                    writer.write(s);
                    writer.write("\r\n");
                } catch (IOException e) {
                    logger.error(s, e);
                }
            });
        }
    }

    public void exportSQL(String sql, Consumer<String> consumer) {
        provider.withDatabase(db -> {
            exportSQL(db, sql, consumer);
            return null;
        });
    }

    public void exportSQL(ODatabaseDocument db, String sql, Consumer<String> consumer) {
        Set<ORID> oridSet = new HashSet<>();
        try (OResultSet rs = db.query(sql, new HashMap())) {
            while (rs.hasNext()) {
                OResult oResult = rs.next();
                oResult.getElement().ifPresent(oElement -> {
                    exportSQL(db, oridSet, oElement, consumer);
                });
            }
        }
    }

    public void exportSQL(ODatabaseDocument db, Set<ORID> oridSet, OElement oElement, Consumer<String> consumer) {
        ORID orid = oElement.getIdentity();
        if (orid.isValid()) {
            if (oridSet.contains(orid)) {
                return;
            }
            oridSet.add(orid);
        }
        for(String name: oElement.getPropertyNames()) {
            exportRefs(db, oridSet, oElement.getProperty(name), consumer);
        }
        if (orid.isValid()) {
            String json = oElement.toJSON();
            logger.info(json);
            consumer.accept(json);
        }
    }

    private void exportRefs(ODatabaseDocument db, Set<ORID> oridSet, Object value, Consumer<String> consumer) {
        if (value instanceof List) {
            for (Object element: (List)value) {
                exportRefs(db, oridSet, element, consumer);
            }
        }
        else if (value instanceof Map) {
            for (Object element: ((Map) value).keySet()) {
                exportRefs(db, oridSet, element, consumer);
            }
        }
        else if (value instanceof OElement) {
            OElement oElement = (OElement) value;
            exportSQL(db, oridSet, oElement, consumer);
        }
    }

    public Map<String, String> importJson(InputStream is) throws UnsupportedEncodingException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, "utf-8"));
        return importJson(() -> {
            try {
                return reader.readLine();
            } catch (IOException e) {
                return null;
            }
        });
    }

    public Map<String, String> importJson(Supplier<String> supplier) {
        Map<String, String> oridMap = new HashMap<>();
        ObjectMapper mapper = new ObjectMapper();
        while (true) {
            String json = supplier.get();
            if (json == null) {
                break;
            }
            try {
                ObjectNode objectNode = (ObjectNode) mapper.readTree(json);
                if (!objectNode.has("@rid")) {
                    logger.warn(String.format("@rid not found: %s", json));
                    continue;
                }
                String oldOrid = objectNode.get("@rid").asText();
                if (oridMap.containsKey(oldOrid)) {
                    continue; // already imported
                }
                objectNode.remove("@rid");
                objectNode.remove("@version");
                processOrids(objectNode, jsonNode -> {
                    String newOrid = oridMap.get(jsonNode.asText());
                    if (newOrid == null) {
                        logger.warn(String.format("New orid for %s not found", oldOrid));
                        return jsonNode;
                    }
                    else {
                        return new TextNode(newOrid);
                    }
                });
                OEntity oEntity = provider.inTransaction(db -> {
                    String newOrid = findODocumentByIndexes(db, mapper, oldOrid, objectNode);
                    if (newOrid != null) {
                        return provider.update(db, newOrid, objectNode);
                    }
                    else {
                        return provider.insert(db, objectNode);
                    }
                });
                oridMap.put(oldOrid, oEntity.getRid());
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
        return oridMap;
    }

    private String findODocumentByIndexes(ODatabaseDocument db, ObjectMapper mapper, String oldOrid, ObjectNode objectNode) {
        JsonNode classNode = objectNode.get("@class");
        String className = classNode != null ? classNode.asText() : null;
        if (className == null || className.length() == 0) {
            throw new IllegalArgumentException("@class not defined");
        }
        OClass oClass = db.getClass(className);
        if (oClass == null) {
            throw new IllegalArgumentException(String.format("class %s not found", className));
        }
        for (OIndex oIndex: oClass.getIndexes()) {
            if (oIndex.isUnique()) {
                OIndexDefinition definition = oIndex.getDefinition();
                List<Object> params = new ArrayList<>();
                for (String fieldName: definition.getFields()) {
                    JsonNode fieldNode = objectNode.get(fieldName);
                    if (fieldNode == null) {
                        params.add(null);
                    }
                    else {
                        try {
                            params.add(mapper.treeToValue(fieldNode, Object.class));
                        } catch (JsonProcessingException e) {
                            logger.warn(e.getMessage());
                            continue;
                        }
                    }
                }
                Object key = definition.createValue(params);
                if (key == null) {
                    continue;
                }
                Object indexValue = oIndex.get(key);
                ORID rid = null;
                if (indexValue instanceof ORID) {
                    rid = (ORID) indexValue;
                }
                else if (indexValue instanceof OIdentifiable) {
                    rid = ((OIdentifiable) indexValue).getIdentity();
                }
                if (rid != null) {
                    String result = rid.toString();
                    logger.info(String.format(
                            "for new object with old rid %s found existing record with rid %s using index %s",
                            oldOrid, result, oIndex.getName()));
                    return result;
                }
            }
        }
        return null;
    }

    public static JsonNode processOrids(JsonNode value, Function<JsonNode, JsonNode> consumer) {
        if (value.isTextual()) {
            String orid = value.asText("");
            Matcher matcher = ridPattern.matcher(orid);
            if (matcher.matches()) {
                return consumer.apply(value);
            }
        }
        if (value.isArray()) {
            ArrayNode arrayNode = (ArrayNode) value;
            for (int i = 0; i < arrayNode.size(); ++i) {
                JsonNode element = arrayNode.get(i);
                int index = i;
                JsonNode newElement = processOrids(element, consumer);
                if (newElement != element) {
                    arrayNode.set(index, newElement);
                }
            }
        }
        else if (value.isObject()) {
            ObjectNode objectNode = (ObjectNode) value;
            Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                JsonNode element = entry.getValue();
                JsonNode newElement = processOrids(element, consumer);
                if (newElement != element) {
                    objectNode.set(entry.getKey(), newElement);
                }
            }
        }
        return value;
    }
}
