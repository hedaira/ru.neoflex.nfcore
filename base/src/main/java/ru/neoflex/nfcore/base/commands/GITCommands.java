package ru.neoflex.nfcore.base.commands;

import com.github.fonimus.ssh.shell.SshShellHelper;
import com.github.fonimus.ssh.shell.commands.SshShellComponent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.shell.standard.ShellMethod;
import org.springframework.shell.standard.ShellOption;
import ru.neoflex.meta.emfgit.Transaction;
import ru.neoflex.nfcore.base.services.Workspace;

import java.io.IOException;
import java.nio.file.FileSystem;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@SshShellComponent
public class GITCommands {
    @Autowired
    Workspace workspace;
    private final SshShellHelper helper;
    private String wd = "/";

    public GITCommands(SshShellHelper helper) {
        this.helper = helper;
    }

    @ShellMethod("Print info about branches")
    public List<String> gitBranchInfo() throws IOException {
        List<String> result = new ArrayList<>();
        result.add("Current branch: " + workspace.getCurrentBranch());
        result.add("Default branch: " + workspace.getDefaultBranch());
        result.add("All branches:");
        for (String branch: workspace.getDatabase().getBranches()) {
            result.add("\t" + branch);
        }
        return result;
    }

    @ShellMethod("Set current branch")
    public List<String> gitSetBranch(String name) throws IOException {
        workspace.setCurrentBranch(name);
        return gitBranchInfo();
    }

    @ShellMethod("List (working) directory")
    public String gitLs(@ShellOption(defaultValue=ShellOption.NULL) String dir) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> {
            FileSystem fs = tx.getFileSystem();
            Path dirPath = getDirectory(fs, dir);
            return Files.list(dirPath).map(path ->
                    Files.isDirectory(path) ? path.getFileName().toString() + "/" : path.getFileName().toString())
                    .collect(Collectors.joining(" "));
        });
    }

    @ShellMethod("Print working directory")
    public String gitPwd(@ShellOption(defaultValue=ShellOption.NULL) String dir) throws Exception {
        return wd;
    }

    @ShellMethod("Change working directory")
    public String gitCd(String dir) throws Exception {
        wd = workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> {
            FileSystem fs = tx.getFileSystem();
            Path newWd = getDirectory(fs, dir);
            return newWd.toString();
        });
        return wd;
    }

    private Path getDirectory(FileSystem fs, String dir) {
        Path path = getPath(fs, dir);
        if (!Files.isDirectory(path)) {
            throw new IllegalArgumentException("Not a directory " + dir);
        }
        return path;
    }

    @ShellMethod("Cat file")
    public String gitCat(String fileName) throws Exception {
        return workspace.getDatabase().inTransaction(workspace.getCurrentBranch(), Transaction.LockType.READ, tx -> {
            FileSystem fs = tx.getFileSystem();
            Path path = getPath(fs, fileName);
            if (!Files.isRegularFile(path)) {
                throw new IllegalArgumentException("Not a file " + fileName);
            }
            return new String(Files.readAllBytes(path), "utf-8");
        });
    }

    private Path getPath(FileSystem fs, String fileName) {
        if (fileName == null) {
            return fs.getPath(wd);
        }
        Path path = fs.getPath(fileName);
        return path.isAbsolute() ? path : fs.getPath(wd, fileName).normalize();
    }

}
