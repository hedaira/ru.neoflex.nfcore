package ru.neoflex.nfcore.base.services.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EClass;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import ru.neoflex.meta.emforientdb.Session;
import ru.neoflex.nfcore.base.services.Store;

import java.util.function.Consumer;
import java.util.function.Supplier;

public class OrientDBFinderProvider extends AbstractSimpleFinderProvider {

    @Override
    protected void findAll(TransactionSPI tx, Consumer<Supplier<Resource>> consumer) {
        execQuery(tx, "select from EObject", consumer);
    }

    private void execQuery(TransactionSPI tx, String sql, Consumer<Supplier<Resource>> consumer, Object... args) {
        Session session = ((OrientDBTransactionProvider)  tx).getSession();
        session.query(sql, consumer, args);
    }

    @Override
    protected void findResourcesByClass(EClass eClass, String name, TransactionSPI tx, Consumer<Supplier<Resource>> consumer) {
        Session session = ((OrientDBTransactionProvider)  tx).getSession();
        String sql = "select from " + session.getOClassName(eClass);
        if (name != null && !name.isEmpty()) {
            EStructuralFeature sf = Store.qualifiedNameDelegate.apply(eClass);
            if (sf != null) {
                execQuery(tx, sql + " where " + sf.getName() + "=?", consumer, name);
                return;
            }
        }
        execQuery(tx, sql, consumer);
    }

    @Override
    protected void findResourcesById(String id, TransactionSPI tx, Consumer<Supplier<Resource>> consumer) {
        Session session = ((OrientDBTransactionProvider)  tx).getSession();
        String sql = "select from EObject where @orid=?";
        execQuery(tx, "select from EObject where @orid=?", consumer, session.getFactory().getORID(id));
    }
}
