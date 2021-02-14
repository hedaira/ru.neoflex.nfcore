package ru.neoflex.nfcore.base.controllers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.neoflex.meta.emfgit.Transaction;
import ru.neoflex.nfcore.base.services.Context;
import ru.neoflex.nfcore.base.services.DeploySupply;
import ru.neoflex.nfcore.base.services.Store;
import ru.neoflex.nfcore.base.services.Workspace;
import ru.neoflex.nfcore.base.services.providers.OrientDBStoreProvider;
import ru.neoflex.nfcore.base.util.DocFinder;
import ru.neoflex.nfcore.base.util.Exporter;

import java.io.*;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController()
@RequestMapping("/system")
public class SysController {
    private final static Log logger = LogFactory.getLog(SysController.class);
    @Autowired
    Workspace workspace;
    @Autowired
    Store store;
    @Autowired
    Context context;
    @Autowired
    DeploySupply deploySupply;
    @Autowired
    OrientDBStoreProvider provider;

    @GetMapping(value = "/user", produces = "application/json; charset=utf-8")
    public Principal getUser(Principal principal) {
        return principal;
    }

    @GetMapping(value = "/branch", produces = "application/json; charset=utf-8")
    public JsonNode getBranchInfo() throws IOException {
        ObjectNode branchInfo = new ObjectMapper().createObjectNode();
        branchInfo.put("current", workspace.getCurrentBranch());
        branchInfo.put("default", workspace.getDefaultBranch());
        ArrayNode branches = branchInfo.withArray("branches");
        for (String branch : workspace.getDatabase().getBranches()) {
            branches.add(branch);
        }
        return branchInfo;
    }

    @PostMapping(value = "/importdb", produces = {"application/json"})
    public ObjectNode importDb(@RequestParam(value = "file") final MultipartFile file) throws Exception {
        int count = context.inContext(()->
            new Exporter(store).unzip(file.getInputStream())
        );
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode result = mapper.createObjectNode().put("count", count);
        return result;
    }

    @PostMapping(value = "/deploySupply", produces = {"application/json"})
    public Object deploySupply(@RequestParam(value = "file") final MultipartFile file) throws RuntimeException {
        Path path = Paths.get(deploySupply.getDeployBase(), file.getOriginalFilename());
        try {
            context.inContext(()->
                    new Exporter(store).unzip(file.getInputStream())
            );
            Files.copy(file.getInputStream(), path);
            logger.info("File " + file.getOriginalFilename() + " successfully imported");
            ObjectMapper mapper = new ObjectMapper();
            return mapper.createObjectNode().put("Supply successfully imported", file.getOriginalFilename());
        } catch (FileAlreadyExistsException e) {
            throw new RuntimeException(
                    "File " + file.getOriginalFilename() + " already exists"
            );
        } catch (Exception e) {
            throw new RuntimeException(
                    "Error while import " + file.getOriginalFilename() + "\n" + e.getMessage()
            );
        }
    }

    @GetMapping(value = "/exportdb")
    public ResponseEntity exportDb() throws IOException {
        PipedInputStream pipedInputStream = new PipedInputStream();
        PipedOutputStream pipedOutputStream = new PipedOutputStream(pipedInputStream);
        new Thread(() -> {
            try {
                try (ZipOutputStream zipOutputStream = new ZipOutputStream(pipedOutputStream);) {
                    store.inTransaction(true, tx -> {
                        List<Resource> all = DocFinder.create(store).getAllResources();
                        new Exporter(store).zip(all, zipOutputStream);
                        return null;
                    });
                    workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> {
                        for (Iterator<Path> it = Files.walk(tx.getFileSystem().getRootPath()).filter(Files::isRegularFile).iterator(); it.hasNext(); ) {
                            Path path = it.next();
                            logger.info("Export " + path.getFileName().toString());
                            byte[] bytes = Files.readAllBytes(path);
                            ZipEntry refsEntry = new ZipEntry(path.toString().substring(1));
                            zipOutputStream.putNextEntry(refsEntry);
                            zipOutputStream.write(bytes);
                            zipOutputStream.closeEntry();
                        }
                        return null;
                    });
                }
            } catch (Exception e) {
                logger.error("Export DB", e);
            }

        }).start();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/zip");
        headers.set("Content-Disposition", "attachment; filename=\"database.zip\"");
        return new ResponseEntity(new InputStreamResource(pipedInputStream), headers, HttpStatus.OK);
    }

    @PostMapping(value = "/exportdb", consumes = {"application/json"})
    public ResponseEntity exportDb(
            @RequestBody Map<String, List<String>> data,
            @RequestParam boolean withReferences,
            @RequestParam boolean withDependents,
            @RequestParam boolean recursiveDependents
    ) throws IOException {
        List<String> ids = data.getOrDefault("resources", Collections.emptyList());
        List<String> files = data.getOrDefault("files", Collections.emptyList());
        PipedInputStream pipedInputStream = new PipedInputStream();
        PipedOutputStream pipedOutputStream = new PipedOutputStream(pipedInputStream);
        new Thread(() -> {
            try {
                try (ZipOutputStream zipOutputStream = new ZipOutputStream(pipedOutputStream);) {
                    context.inContext(()->store.inTransaction(true, tx -> {
                        List<Resource> resources = new ArrayList<>();
                        for (String id : ids) {
                            resources.add(store.loadResource(store.getUriByIdAndRev(id, null)));
                        }
                        if (withDependents) {
                            resources = DocFinder.create(store).getDependentResources(resources, recursiveDependents);
                        }
                        if (withReferences) {
                            ResourceSet wr = store.createResourceSet();
                            wr.getResources().addAll(resources);
                            EcoreUtil.resolveAll(wr);
                            resources = new ArrayList<>(wr.getResources());
                        }
                        new Exporter(store).zip(resources, zipOutputStream);
                        return null;
                    }));
                    workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> {
                        for (String file : files) {
                            Path filePath = tx.getFileSystem().getRootPath().resolve(file);
                            if (Files.isRegularFile(filePath)) {
                                logger.info("Export " + file);
                                byte[] bytes = Files.readAllBytes(filePath);
                                ZipEntry refsEntry = new ZipEntry(file.substring(1));
                                zipOutputStream.putNextEntry(refsEntry);
                                zipOutputStream.write(bytes);
                                zipOutputStream.closeEntry();
                            }
                        }
                        return null;
                    });
                }
            } catch (Exception e) {
                logger.error("Export DB", e);
            }

        }).start();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/zip");
        headers.set("Content-Disposition", "attachment; filename=\"database.zip\"");
        return new ResponseEntity(new InputStreamResource(pipedInputStream), headers, HttpStatus.OK);
    }

    @PutMapping(value = "/branch/{name}", produces = "application/json; charset=utf-8")
    public JsonNode setCurrentBranch(@PathVariable String name) throws IOException {
        workspace.setCurrentBranch(name);
        return getBranchInfo();
    }

    @GetMapping(value = "/fs", produces = "application/json; charset=utf-8")
    public JsonNode listFs(@RequestParam String path) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> listPath(tx, path));
    }

    @GetMapping(value = "/fs/data", produces = "application/json; charset=utf-8")
    public ResponseEntity downloadFs(@RequestParam String path) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> {
            Path resolved = tx.getFileSystem().getRootPath().resolve(path);
            byte[] contents = Files.isRegularFile(resolved) ? Files.readAllBytes(resolved) : new byte[0];
            HttpHeaders headers = new HttpHeaders();
            //headers.set("Content-Type", "application/zip");
            headers.set("Content-Disposition", String.format("attachment; filename=\"%s\"", resolved.getFileName().toString()));
            return new ResponseEntity(new InputStreamResource(new ByteArrayInputStream(contents)), headers, HttpStatus.OK);
        });
    }

    public ArrayNode listPath(Transaction tx, @RequestParam String path) throws IOException {
        ArrayNode list = new ObjectMapper().createArrayNode();
        Path dir = tx.getFileSystem().getRootPath().resolve(path);
        if (Files.isDirectory(dir)) {
            Files.walk(dir, 1).skip(1)
                    .sorted(Comparator.comparing(p -> (Files.isDirectory(p) ? "0" : "1") + p.getFileName().toString()))
                    .forEach(child -> {
                        String key = child.toString();
                        ObjectNode childNode = list.addObject();
                        childNode.put("key", key);
                        childNode.put("title", child.getFileName().toString());
                        childNode.put("isLeaf", !Files.isDirectory(child));
                        if (Files.isDirectory(child)) {
                            try {
                                childNode.set("children", listPath(tx, child.toString()));
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        }
                    });
        }
        return list;
    }

    @DeleteMapping(value = "/fs", produces = "application/json; charset=utf-8")
    public JsonNode deleteFs(@RequestParam String path) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.WRITE, tx -> {
            Path resolved = tx.getFileSystem().getRootPath().resolve(path);
            if (Files.isDirectory(resolved)) {
                workspace.getDatabase().deleteRecursive(resolved);
                tx.commit("Deleting directory " + path);
            } else if (Files.isRegularFile(resolved)) {
                Files.delete(resolved);
                tx.commit("Deleting file " + path);
            }
            Path parent = resolved.getParent();
            return listPath(tx, parent.toString());
        });
    }

    @DeleteMapping(value = "/fs/many", produces = "application/json; charset=utf-8")
    public void deleteFsMany(@RequestParam String paths) throws Exception {
        workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.WRITE, tx -> {
            for (String path : Arrays.asList(paths.split(";"))) {
                Path resolved = tx.getFileSystem().getRootPath().resolve(path);
                if (Files.isDirectory(resolved)) {
                    workspace.getDatabase().deleteRecursive(resolved);
                    tx.commit("Deleting directory " + path);
                } else if (Files.isRegularFile(resolved)) {
                    Files.delete(resolved);
                    tx.commit("Deleting file " + path);
                }
                Path parent = resolved.getParent();
            }
            return null;
        });
    }

    @PutMapping(value = "/fs", produces = "application/json; charset=utf-8")
    public JsonNode createFsFile(@RequestParam String path, @RequestBody(required = false) String text) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.WRITE, tx -> {
            Path filePath = tx.getFileSystem().getRootPath().resolve(path);
            Path parent = filePath.getParent();
            Files.createDirectories(parent);
            byte[] bytes = text == null ? new byte[0] : text.getBytes("utf-8");
            Files.write(filePath, bytes);
            tx.commit("Saving file " + path);
            return listPath(tx, parent.toString());
        });
    }

    @PostMapping(value = "/fs", produces = "application/json; charset=utf-8")
    public JsonNode createFsFile(@RequestParam String path, @RequestParam String name, @RequestParam(value = "file") final MultipartFile file) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.WRITE, tx -> {
            Path parent = tx.getFileSystem().getRootPath().resolve(path);
            Path filePath = parent.resolve(name);
            Files.createDirectories(parent);
            Files.copy(file.getInputStream(), filePath);
            tx.commit("Saving file " + path + "/" + name);
            return listPath(tx, parent.toString());
        });
    }

    @PutMapping(value = "/fs/rename", produces = "application/json; charset=utf-8")
    public JsonNode renameFsFile(@RequestParam String path, @RequestParam String name) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.WRITE, tx -> {
            Path filePath = tx.getFileSystem().getRootPath().resolve(path);
            Path parent = filePath.getParent();
            Path newPath = parent.resolve(name);
            Files.move(filePath, newPath);
            tx.commit("Renaming file " + path + " to " + name);
            return listPath(tx, parent.toString());
        });
    }

    @PostMapping(value = "/orientdb/backup", produces = "application/json; charset=utf-8")
    public List<String> dbBackup(@RequestParam String dbName) throws Exception {
        return Collections.singletonList(provider.getServer().backupDatabase(dbName).getAbsolutePath());
    }

    @GetMapping(value = "/orientdb/buckup", produces = "application/json; charset=utf-8")
    public List<String> dbListBackups(@RequestParam String dbName) throws Exception {
        return provider.getServer().listBackupNames(dbName);
    }

    @PostMapping(value = "/orientdb/restore", produces = "application/json; charset=utf-8")
    public List<String> dbRestore(@RequestParam String fileName) throws Exception {
        return Collections.singletonList(provider.getServer().restoreDatabase(fileName));
    }

    @PostMapping(value = "/orientdb/export", produces = "application/json; charset=utf-8")
    public List<String> dbExport(@RequestParam String dbName) throws Exception {
        return Collections.singletonList(provider.getServer().exportDatabase(dbName).getAbsolutePath());
    }

    @GetMapping(value = "/orientdb/export", produces = "application/json; charset=utf-8")
    public List<String> dbListExports(@RequestParam String dbName) throws Exception {
        return provider.getServer().listExportNames(dbName);
    }

    @PostMapping(value = "/orientdb/import", produces = "application/json; charset=utf-8")
    public List<String> dbImport(@RequestParam String fileName) throws Exception {
        return Collections.singletonList(provider.getServer().importDatabase(fileName));
    }

    @PostMapping(value = "/orientdb/vacuum", produces = "application/json; charset=utf-8")
    public List<String> dbVacuum(@RequestParam String dbName) throws Exception {
        return Collections.singletonList(provider.getServer().vacuum(dbName));
    }

}
