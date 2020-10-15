package ru.neoflex.nfcore.base.controllers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.eclipse.emf.common.util.EList;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EClass;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EOperation;
import org.eclipse.emf.ecore.EPackage;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import ru.neoflex.nfcore.base.auth.AuthFactory;
import ru.neoflex.nfcore.base.auth.CurrentLock;
import ru.neoflex.nfcore.base.auth.impl.AuditImpl;
import ru.neoflex.nfcore.base.components.PackageRegistry;
import ru.neoflex.nfcore.base.services.Context;
import ru.neoflex.nfcore.base.services.Store;
import ru.neoflex.nfcore.base.tag.impl.TaggedImpl;
import ru.neoflex.nfcore.base.util.DocFinder;
import ru.neoflex.nfcore.base.util.EmfJson;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static ru.neoflex.nfcore.base.util.EmfJson.createEOperationArguments;

@RestController()
@RequestMapping("/emf")
public class EMFController {
    @Autowired
    Store store;
    @Autowired
    PackageRegistry registry;
    @Autowired
    Context context;
    ObjectMapper mapper;

    @PostConstruct
    void init() {
        mapper = EmfJson.createMapper();
    }

    @GetMapping("/resource")
    JsonNode getResource(@RequestParam String ref) throws Exception {
        return store.inTransaction(true, tx -> {
            Resource resource = store.loadResource(ref);
            EcoreUtil.resolveAll(resource);
            ObjectNode result = EmfJson.resourceToTree(store, resource);
            return result;
        });
    }

    @GetMapping("/resourceset")
    JsonNode getResourceSet(@RequestParam String ref) throws Exception {
        return store.inTransaction(true, tx -> {
            Resource resource = store.loadResource(ref);
            ResourceSet rs = resource.getResourceSet();
            EcoreUtil.resolveAll(rs);
            ObjectNode result = EmfJson.resourceSetToTree(store, rs.getResources());
            return result;
        });
    }

    @DeleteMapping("/resource")
    JsonNode deleteObject(@RequestParam String ref) throws Exception {
        return store.inTransaction(false, tx -> {
            store.deleteResource(ref);
            store.commit("Delete " + ref);
            return mapper.createObjectNode().put("result", "ok");
        });
    }

    @PutMapping("/resource")
    JsonNode putObject(@RequestParam(required = false) String ref, @RequestBody JsonNode contents) throws Exception {
        Resource created = store.inTransaction(false, tx -> {
            Resource resource = store.treeToResource(ref, contents);
            store.saveResource(resource);
            store.commit("Put " + ref);
            return resource;
        });
        return getResource(store.getRef(created));
    }

    @GetMapping("/packages")
    JsonNode getPackages() {
        ArrayNode nodes = mapper.createArrayNode();
        for (EPackage ePackage: registry.getEPackages()) {
            nodes.add(mapper.valueToTree(ePackage));
        }
        return nodes;
    }

    @PostMapping("/find")
    JsonNode find(@RequestParam(required = false) String tags, @RequestBody ObjectNode selector) throws Exception {
        return store.inTransaction(true, tx -> {
            DocFinder docFinder = DocFinder.create(store)
                    .executionStats(true)
                    .selector(selector)
                    .execute();
            ResourceSet resourceSet = docFinder.getResourceSet();
            Integer size = resourceSet.getResources().size();
            if (tags != null && !tags.equals("")) {
                List<Resource> filtered = new ArrayList<>();
                new ArrayList<>(resourceSet.getResources()).forEach(resource -> {
                    if (((TaggedImpl) resource.getContents().get(0)).getTags()
                            .stream()
                            .filter(resourceTag -> ("," + tags + ",").contains("," + resourceTag.getName() + ","))
                            .findAny()
                            .orElse(null) == null) {
                        filtered.add(resource);
                    }
                });
                size = size - filtered.size();
                filtered.forEach(resource -> resourceSet.getResources().remove(resource));
            }
            List<Resource> resources = new ArrayList<>(resourceSet.getResources());
            EcoreUtil.resolveAll(resourceSet);
            ObjectNode resourceSetNode = EmfJson.resourceSetToTree(store, resourceSet.getResources());
            resourceSetNode.set("executionStats", docFinder.getExecutionStats());
            resourceSetNode.put("warning", docFinder.getWarning());
            resourceSetNode.put("bookmark", docFinder.getBookmark());
            resourceSetNode.put("size", size);
            return resourceSetNode;
        });
    }

    @PostMapping("/call")
    JsonNode call(@RequestParam String ref, @RequestParam String method, @RequestBody List<Object> args) throws Exception {
        return callImpl(true, ref, method, args);
    }

    @PostMapping("/calltx")
    JsonNode callTx(@RequestParam String ref, @RequestParam String method, @RequestBody List<Object> args) throws Exception {
        return callImpl(false, ref, method, args);
    }

    @PostMapping("/currentLock")
    JsonNode createCurrentLock(@RequestParam String name) throws Exception {
        return store.inTransaction(true, tx -> {
            DocFinder docFinder = DocFinder.create(store);
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode selector = objectMapper.createObjectNode();
            selector
                    .with("contents")
                    .put("eClass", "ru.neoflex.nfcore.base.auth#//CurrentLock")
                    .put("name", name);
            try {
                docFinder
                        .executionStats(true)
                        .selector(selector)
                        .execute();
                EList<Resource> resources = docFinder.getResourceSet().getResources();
                if (resources.size() != 0) {
                    throw new RuntimeException(
                            "Editing is not available. The object is taken for editing by the user: " +
                                    ((AuditImpl)resources.get(0).getContents().get(0).eContents().get(0)).getCreatedBy() +
                                    " " +
                                    ((AuditImpl)resources.get(0).getContents().get(0).eContents().get(0)).getCreated()
                            );
                }
                else {
                    CurrentLock currentLock = AuthFactory.eINSTANCE.createCurrentLock();
                    currentLock.setName(name);
                    store.createEObject(currentLock);
                    store.commit("Create currentLock " + name);
                    return mapper.createObjectNode().put("result", "ok");
                }
            } catch (RuntimeException e) {
                throw new RuntimeException(e.getMessage());
            }
        });
    }

    @PostMapping("/deleteLock")
    JsonNode deleteLock(@RequestParam String name) throws Exception {
        return store.inTransaction(true, tx -> {
            DocFinder docFinder = DocFinder.create(store);
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode selector = objectMapper.createObjectNode();
            selector
                    .with("contents")
                    .put("eClass", "ru.neoflex.nfcore.base.auth#//CurrentLock")
                    .put("name", name);
            try {
                docFinder
                        .executionStats(true)
                        .selector(selector)
                        .execute();
                EList<Resource> resources = docFinder.getResourceSet().getResources();

                String ref = resources.get(0).getURI().segment(0) + "?" + resources.get(0).getURI().query();
                store.deleteResource(ref);
                store.commit("Delete " + ref);
                return mapper.createObjectNode().put("result", "ok");
            } catch (RuntimeException e) {
                throw new RuntimeException(e.getMessage());
//                throw new RuntimeException("The file was unlocked by another user");
            }
        });
    }

    private JsonNode callImpl(boolean readOnly, String ref, String method, List<Object> args) throws Exception {
        return store.inTransaction(readOnly, tx -> {
            Resource resource = store.loadResource(ref);
            EcoreUtil.resolveAll(resource.getResourceSet());
            String fragment = URI.createURI(ref).fragment();
            EObject eObject = fragment == null ?
                    resource.getContents().get(0) : resource.getEObject(fragment);
            EClass eClass = eObject.eClass();
            for (EOperation eOperation: eClass.getEAllOperations()) {
                if (eOperation.getName().equals(method)) {
                    EList<?> arguments = createEOperationArguments(store, eOperation, args);
                    Object result = eObject.eInvoke(eOperation, arguments);
                    if (!readOnly) {
                        store.commit("Call with tx " + method + "(" + ref + ", " +
                                args.stream().map(Object::toString).collect(Collectors.joining(", ")) + ")");
                    }
                    return mapper.valueToTree(result);
                }
            }
            throw new RuntimeException("calltx: EOperation " + method + " not found in " + EcoreUtil.getURI(eClass));
        });
    }
}

