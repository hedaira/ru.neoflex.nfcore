package ru.neoflex.nfcore.base.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.ContextAttributes;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.eclipse.emf.common.util.*;
import org.eclipse.emf.ecore.*;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.ecore.xmi.impl.XMLResourceImpl;
import org.emfjson.jackson.annotations.EcoreIdentityInfo;
import org.emfjson.jackson.annotations.EcoreTypeInfo;
import org.emfjson.jackson.databind.EMFContext;
import org.emfjson.jackson.module.EMFModule;
import org.emfjson.jackson.resource.JsonResource;
import org.emfjson.jackson.resource.JsonResourceFactory;
import org.emfjson.jackson.utils.ValueReader;
import org.emfjson.jackson.utils.ValueWriter;
import ru.neoflex.nfcore.base.services.Store;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS;

public class EmfJson {
    public static Resource treeToResource(ResourceSet resourceSet, URI uri, JsonNode contents) throws IOException {
        Resource resource = resourceSet.createResource(uri);
        Map<URI, Resource> map = new HashMap<>();
        map.put(uri.trimQuery(), resource);
        ((ResourceSetImpl)resourceSet).setURIResourceMap(map);
        return treeToResource(contents, resource);
    }

    public static ObjectMapper createMapper() {
        ObjectMapper mapper = new ObjectMapper();
        EMFModule emfModule = new EMFModule();
        emfModule.configure(EMFModule.Feature.OPTION_USE_ID, true);
        emfModule.setTypeInfo(new EcoreTypeInfo("eClass"));
        emfModule.setIdentityInfo(new EcoreIdentityInfo("_id",
                (ValueReader<Object, String>) (value, context) -> {
                    return value.toString();
                },
                (ValueWriter<EObject, Object>) (eObject, context) -> {
                    Resource resource = EMFContext.getResource(context, eObject);
                    return resource != null ? resource.getURIFragment(eObject) : null;
                }));
        mapper.registerModule(emfModule);
        mapper.configure(WRITE_DATES_AS_TIMESTAMPS, false);
        return mapper;
    }

    public static Resource treeToResource(JsonNode contents, Resource resource) throws JsonProcessingException {
        ObjectMapper mapper = createMapper();
        JsonResource jsonResource = (JsonResource) new JsonResourceFactory(mapper).createResource(resource.getURI().trimQuery());
        ContextAttributes attributes = ContextAttributes
                .getEmpty()
                .withSharedAttribute("resourceSet", jsonResource.getResourceSet())
                .withSharedAttribute("resource", jsonResource);
        mapper.reader()
                .with(attributes)
                .withValueToUpdate(jsonResource)
                .treeToValue(contents, Resource.class);
        if (resource instanceof XMLResourceImpl) {
            XMLResourceImpl xmlResource = (XMLResourceImpl) resource;
            for (Iterator<EObject> it = jsonResource.getAllContents(); it.hasNext();) {
                EObject eObject = it.next();
                xmlResource.setID(eObject, jsonResource.getID(eObject));
            }
        }
        resource.getContents().addAll(jsonResource.getContents());
        return resource;
    }

    public static ObjectNode resourceToTree(Store store, Resource resource) {
        ObjectMapper mapper = createMapper();
        ObjectNode result = mapper.createObjectNode();
        result.put("uri", store.getRef(resource));
        JsonResource jsonResource = (JsonResource) new JsonResourceFactory(mapper).createResource(resource.getURI());
        EcoreUtil.Copier copier = new EcoreUtil.Copier();
        Collection<EObject> copyContent = copier.copyAll(resource.getContents());
        copier.copyReferences();
        jsonResource.getContents().addAll(copyContent);
        if (resource instanceof XMLResourceImpl) {
            XMLResourceImpl xmlResource = (XMLResourceImpl) resource;
            for (Map.Entry<EObject, EObject> entry: copier.entrySet()) {
                String id = xmlResource.getID(entry.getKey());
                jsonResource.setID(entry.getValue(), id);
            }
        }
        result.withArray("contents").addAll(
                jsonResource.getContents().stream().map(mapper::<JsonNode>valueToTree).collect(Collectors.toList())
        );
        return result;
    }

    public static ObjectNode resourceSetToTree(Store store, List<Resource> resources) {
        ObjectMapper mapper = createMapper();
        ObjectNode result = mapper.createObjectNode();
        result.withArray("resources");
        for (Resource resource: resources) {
            result.withArray("resources").add(resourceToTree(store, resource));
        }
        return result;
    }

    public static Object fromJson(Store store, EClassifier eType, Object arg) throws IOException {
        if (arg == null) {
            return null;
        }
        if (eType.getName().equals("EStringToStringMapEntry")) {
            ObjectMapper oMapper = new ObjectMapper();
            Map<String, String> params = oMapper.convertValue(arg, Map.class);
            EMap<String, String> updatedParams = new BasicEMap<String, String>();
            for(Map.Entry<String, String> entry : params.entrySet()) {
                String key = entry.getKey();
                String value = entry.getValue();
                updatedParams.put(key, value);
            }
            return updatedParams;
        }
        if (eType instanceof EClass) {
            EClass eClass = (EClass) eType;
            if (arg instanceof Map) {
                Map node = (Map) arg;
                String ref = (String) node.get("$ref");
                if (ref != null) {
                    Resource resource = store.loadResource(ref);
                    return resource.getContents().get(0);
                }
                else {
                    EObject eObject = EcoreUtil.create(eClass);
                    for (EAttribute attr: eClass.getEAllAttributes()) {
                        if (node.containsKey(attr.getName())) {
                            eObject.eSet(attr, node.get(attr.getName()));
                        }
                    }
                    return eObject;
                }
            }
            if (arg instanceof List) {
                List<Map> argList = (List<Map>) arg;
                EList<EObject> conditions = new BasicEList();
                for (Map node: argList) {
                    EObject eObject = EcoreUtil.create(eClass);
                    for (EAttribute attr: eClass.getEAllAttributes()) {
                        if (node.containsKey(attr.getName())) {
                            eObject.eSet(attr, node.get(attr.getName()));
                        }
                    }
                    conditions.add(eObject);
                }
                return conditions;
            }
        }
        if (eType instanceof EDataType) {
            EDataType eDataType = (EDataType) eType;
            return EcoreUtil.createFromString(eDataType, arg.toString());
        }
        return arg;
    }

    public static EList<?> createEOperationArguments(Store store, EOperation eOperation, List<Object> args) {
        return ECollections.toEList(IntStream.range(0, eOperation.getEParameters().size()).mapToObj(i -> {
            if (i >= args.size()) {
                return null;
            }
            Object arg = args.get(i);
            EParameter eParameter = eOperation.getEParameters().get(i);
            EClassifier eType = eParameter.getEType();
            try {
                return fromJson(store, eType, arg);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }).collect(Collectors.toList()));
    }
}
