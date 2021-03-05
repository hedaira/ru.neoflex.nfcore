package ru.neoflex.meta.emforientdb;

import com.orientechnologies.orient.core.db.ODatabaseDocumentInternal;
import com.orientechnologies.orient.core.db.ODatabaseRecordThreadLocal;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.exception.OConcurrentModificationException;
import com.orientechnologies.orient.core.id.ORID;
import com.orientechnologies.orient.core.id.ORecordId;
import com.orientechnologies.orient.core.record.ORecord;
import com.orientechnologies.orient.core.tx.OTransaction;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.*;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceFactoryImpl;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public abstract class SessionFactory {
    public final static String ORIENTDB = "orientdb";
    private static final Logger logger = LoggerFactory.getLogger(SessionFactory.class);
    public final static String QNAME = "qName";

    private Function<EClass, EAttribute> qualifiedNameDelegate;
    private final String dbName;
    protected final List<EPackage> packages;
    Map<String, URI> oClassToUriMap = new HashMap<>();
    private Events events = new Events();

    public SessionFactory(String dbName, List<EPackage> packages) {
        this.dbName = dbName;
        this.packages = packages;
    }
    public abstract ODatabaseDocument createDatabaseDocument();

    public Session createSession() {
        ODatabaseDocumentInternal currendDB = ODatabaseRecordThreadLocal.instance().getIfDefined();
        return new Session(this, createDatabaseDocument(), currendDB);
    }

    public List<EPackage> getPackages() {
        return packages;
    }

    public List<EClass> getEClasses() {
        List<EClass> eClasses = new ArrayList<>();
        for (EPackage ePackage : this.packages) {
            for (EClassifier eClassifier : ePackage.getEClassifiers()) {
                if (eClassifier instanceof EClass) {
                    EClass eClass = (EClass) eClassifier;
                    eClasses.add(eClass);
                }
            }
        }
        return eClasses;
    }

    public void createSchema() {
        try (Session session = createSession()) {
            session.createSchema();
        }
    }

    public URI createURI() {
        return createURI("");
    }

    public URI createURI(String ref) {
        URI uri = URI.createURI(ORIENTDB + "://" +dbName + "/" + (ref == null ? "" : ref));
        return uri;
    }

    public URI createResourceURI(ORecord oRecords) {
        return createResourceURI(Collections.singletonList(oRecords));

    }
    public URI createResourceURI(List<? extends ORecord> oRecords) {
        String id = oRecords.stream().map(oRecord -> getId(oRecord.getIdentity())).collect(Collectors.joining(","));
        String rev = oRecords.stream().map(oRecord -> String.valueOf(oRecord.getVersion())).collect(Collectors.joining(","));
        String ref = String.format("%s?rev=%s", id, rev);
        return createURI(ref);
    }

    public String getId(ORID orid) {
        return String.format("%d_%d", orid.getClusterId(), orid.getClusterPosition());
    }

    public String getId(URI uri) {
        if (uri.hasFragment()) {
            if (!uri.fragment().startsWith("/")) {
                return uri.fragment();
            }
            if (!uri.fragment().equals("/")) {
                return null;
            }
        }
        if (uri.segmentCount() >= 1) {
            return uri.segment(0);
        }
        return null;
    }

    public Stream<ORID> getORIDs(URI uri) {
        String id = getId(uri);
        if (id == null) {
            return Stream.empty();
        }
        return getORIDs(id);
    }

    public Stream<ORID> getORIDs(String idl) {
        return Arrays.stream(idl.split(",")).map(id -> {
            String[] ids = id.split("_", 2);
            if (ids.length != 2) {
                return null;
            }
            try {
                return new ORecordId(new Integer(ids[0]), new Long(ids[1]));
            }
            catch (NumberFormatException nfe) {
                return null;
            }
        });
    }

    public Stream<Integer> getVersions(URI uri) {
        String query = uri.query();
        if (query == null || !query.contains("rev=")) {
            return Stream.empty();
        }
        return Arrays.stream(query.split("rev=")[1].split(",")).map(s -> Integer.valueOf(s));
    }

    public ORID getORID(URI uri) {
        String id = getId(uri);
        if (id == null) {
            return null;
        }
        return getORID(id);
    }

    public ORID getORID(String idl) {
        return getORIDs(idl).filter(Objects::nonNull).findFirst().orElse(null);
    }

    public Integer getVersion(URI uri) {
        return getVersions(uri).filter(Objects::nonNull).findFirst().orElse(null);
    }

    public EPackage getEPackage(String part) {
        for (EPackage ePackage: packages) {
            if (ePackage.getNsPrefix().equals(part)) {
                return ePackage;
            }
        }
        return null;
    }

    public ResourceSet createResourceSet() {
        ResourceSetImpl resourceSet = new ResourceSetImpl();
        resourceSet.getPackageRegistry()
                .put(EcorePackage.eNS_URI, EcorePackage.eINSTANCE);
        for (EPackage ePackage : packages) {
            resourceSet.getPackageRegistry()
                    .put(ePackage.getNsURI(), ePackage);
        }
        resourceSet.setURIResourceMap(new HashMap<>());
        resourceSet.getResourceFactoryRegistry()
                .getProtocolToFactoryMap()
                .put(ORIENTDB, new ResourceFactoryImpl() {
                    @Override
                    public Resource createResource(URI uri) {
                        return new OrientDBResource(uri);
                    }
                });
        return resourceSet;
    }

    public EAttribute getQNameFeature(EClass eClass) {
        if (qualifiedNameDelegate != null) {
            return qualifiedNameDelegate.apply(eClass);
        }
        return (EAttribute) eClass.getEStructuralFeature(QNAME);
    }


    public Function<EClass, EAttribute> getQualifiedNameDelegate() {
        return qualifiedNameDelegate;
    }

    public void setQualifiedNameDelegate(Function<EClass, EAttribute> qualifiedNameDelegate) {
        this.qualifiedNameDelegate = qualifiedNameDelegate;
    }

    public String getDbName() {
        return dbName;
    }

    public Events getEvents() {
        return events;
    }

    public interface SessionFunction<R> {
        R call(Session session) throws Exception;
    }

    public interface SessionProcedure {
        void call(Session session) throws Exception;
    }

    public<R> R withSession(SessionFunction<R> f) throws Exception {
        try (Session session = createSession()) {
            return f.call(session);
        }
    }

    public void withSession(SessionProcedure f) throws Exception {
        withSession(session -> {
            f.call(session);
            return null;
        });
    }

    public <R> R inTransaction(SessionFunction<R> f) throws Exception {
        int delay = 1;
        int maxDelay = 1000;
        int maxAttempts = 100;
        int attempt = 1;
        while (true) {
            try {
                return withSession(session -> {
                    session.getSavedResources().clear();
                    session.getDatabaseDocument().begin(OTransaction.TXTYPE.OPTIMISTIC);
                    try {
                        return f.call(session);
                    }
                    catch (Throwable tx) {
                        session.getDatabaseDocument().rollback();
                        throw tx;
                    }
                    finally {
                        session.getDatabaseDocument().commit(true);
                        for (Resource resource: session.savedResourcesMap.keySet()) {
                            resource.setURI(createResourceURI(session.savedResourcesMap.get(resource)));
                        }
                    }
                });
            }
            catch (OConcurrentModificationException e) {
                String message = e.getClass().getSimpleName() + ": " + e.getMessage() + " attempt no " + attempt;
                logger.debug(message);
                if (++attempt > maxAttempts) {
                    throw e;
                }
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ex) {
                }
                if (delay < maxDelay) {
                    delay *= 2;
                }
                continue;
            }
        }
    }

    public void inTransaction(SessionProcedure f) throws Exception {
        inTransaction(session -> {
            f.call(session);
            return null;
        });
    }
}
