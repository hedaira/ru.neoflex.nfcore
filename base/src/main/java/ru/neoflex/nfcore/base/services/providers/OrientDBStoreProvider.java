package ru.neoflex.nfcore.base.services.providers;

import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EAttribute;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import ru.neoflex.meta.emfgit.Database;
import ru.neoflex.meta.emforientdb.Server;
import ru.neoflex.nfcore.base.components.PackageRegistry;
import ru.neoflex.nfcore.base.services.Store;
import ru.neoflex.nfcore.base.types.TypesPackage;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.io.IOException;

@Service
@ConditionalOnProperty(name = "dbtype", havingValue = "orientdb", matchIfMissing = false)
public class OrientDBStoreProvider implements StoreSPI {
    @Value("${orientdb.home:${user.home}/.orientdb/home}")
    String home;
    @Value("${orientdb.dbname:models}")
    String dbName;
    @Autowired
    PackageRegistry registry;

    Server server;

    @PostConstruct
    public void init() throws Exception {
        server = new Server(home, dbName, registry.getEPackages());
        server.setQualifiedNameDelegate(Store.qualifiedNameDelegate);
        server.open();
    }

    @PreDestroy
    public void fini() {
        server.close();
    }

    @Override
    public URI getUriByIdAndRev(String id, String rev) {
        return server.createURI(id + "?rev=" + rev).appendFragment("/");
    }

    @Override
    public Resource saveResource(Resource resource) throws IOException {
        resource.save(null);
        return resource;
    }

    @Override
    public URI getUriByRef(String ref) {
        return server.createURI(ref).appendFragment("/");
    }

    @Override
    public ResourceSet createResourceSet(TransactionSPI tx) {
        return ((OrientDBTransactionProvider) tx).getSession().createResourceSet();
    }

    @Override
    public Resource createEmptyResource(ResourceSet resourceSet) {
        return resourceSet.createResource(server.createURI());
    }

    @Override
    public Resource loadResource(URI uri, TransactionSPI tx) throws IOException {
        Resource resource = ((OrientDBTransactionProvider) tx).getSession().createResourceSet().createResource(uri);
        ((OrientDBTransactionProvider) tx).getSession().load(resource);
        return resource;
    }

    @Override
    public void deleteResource(URI uri, TransactionSPI tx) throws IOException {
        Resource resource = ((OrientDBTransactionProvider) tx).getSession().createResourceSet().createResource(uri);
        resource.delete(null);
    }

    @Override
    public String getRef(Resource resource) {
        URI uri = resource.getURI();
        String ref =  server.getId(uri);
        String query = uri.query();
        if (query != null) {
            ref = ref + "?" + query;
        }
        String fragment = uri.fragment();
        if (fragment != null) {
            ref = ref + "#" + fragment;
        }
        return ref;
    }

    @Override
    public String getId(Resource resource) {
        return server.getId(resource.getURI());
    }

    @Override
    public FinderSPI createFinderProvider() {
        return new OrientDBFinderProvider();
    }

    @Override
    public TransactionSPI getCurrentTransaction() throws IOException {
        return OrientDBTransactionProvider.getCurrent();
    }

    @Override
    public <R> R inTransaction(boolean readOnly, Transactional<R> f) throws Exception {
        if (readOnly) {
            return server.withSession(session -> {
                OrientDBTransactionProvider tx = new OrientDBTransactionProvider(this, session);
                OrientDBTransactionProvider.setCurrent(tx);
                try {
                    return f.call(tx);
                }
                finally {
                    OrientDBTransactionProvider.setCurrent(null);
                }
            });
        }
        else {
            return server.inTransaction(session -> {
                OrientDBTransactionProvider tx = new OrientDBTransactionProvider(this, session);
                OrientDBTransactionProvider.setCurrent(tx);
                try {
                    return f.call(tx);
                }
                finally {
                    OrientDBTransactionProvider.setCurrent(null);
                }
            });
        }
    }
}
