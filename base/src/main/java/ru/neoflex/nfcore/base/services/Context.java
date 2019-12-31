package ru.neoflex.nfcore.base.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import ru.neoflex.nfcore.base.components.PackageRegistry;
import ru.neoflex.nfcore.base.components.Publisher;

import java.util.concurrent.Callable;

@Service
public class Context {
    private static final Logger logger = LoggerFactory.getLogger(Context.class);

    @Autowired
    private Store store;
    @Autowired
    private Groovy groovy;
    @Autowired
    private Workspace workspace;
    @Autowired
    private Publisher publisher;
    @Autowired
    private Epsilon epsilon;
    @Autowired
    private PackageRegistry registry;
    @Autowired
    private Scheduler scheduler;
    @Autowired
    private Authorization authorization;

    private static final ThreadLocal<Context> tlContext = new ThreadLocal<Context>();

    public static Context getCurrent() {
        return tlContext.get();
    }

    public void setCurrent() {
        tlContext.set(this);
    }

    public Store getStore() {
        return store;
    }

    public Groovy getGroovy() {
        return groovy;
    }

    public Workspace getWorkspace() {
        return workspace;
    }

    public Publisher getPublisher() {
        return publisher;
    }

    public Epsilon getEpsilon() {
        return epsilon;
    }

    public PackageRegistry getRegistry() {
        return registry;
    }

    public<R> R inContext(Callable<R> f) throws Exception {
        setCurrent();
        return f.call();
    }

    public<R> R inContextWithClassLoaderInTransaction(Callable<R> f) throws Exception {
        return inContextWithClassLoaderInTransaction(false, f);
    }

    public<R> R inContextWithClassLoaderInTransaction(boolean readOnly, Callable<R> f) throws Exception {
        return inContext(()->workspace.withClassLoader(()->store.inTransaction(readOnly, tx -> {return f.call();})));
    }

    public Scheduler getScheduler() {
        return scheduler;
    }

    public Authorization getAuthorization() {
        return authorization;
    }
}
