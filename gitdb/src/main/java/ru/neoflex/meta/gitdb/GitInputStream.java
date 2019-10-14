package ru.neoflex.meta.gitdb;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.cfg.ContextAttributes;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.URIConverter;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

public class GitInputStream extends InputStream implements URIConverter.Loadable {
    private GitHandler handler;
    private URI uri;
    private Map<?, ?> options;

    public GitInputStream(GitHandler handler, URI uri, Map<?, ?> options) {
        this.handler = handler;
        this.uri = uri;
        this.options = options;
    }

    @Override
    public int read() throws IOException {
        return 0;
    }

    @Override
    public void loadResource(Resource resource) throws IOException {
        Transaction transaction = handler.getTransaction();
        EMFJSONDB db = (EMFJSONDB) transaction.getDatabase();
        String id = db.getId(uri);
        EntityId entityId = new EntityId(id, null);
        Entity entity = transaction.load(entityId);
        String rev = entity.getRev();
        if (!resource.getContents().isEmpty()) {
            resource.getContents().clear();
        }
        db.loadResource(entity.getContent(), resource);
        URI newURI = resource.getURI().trimFragment().trimQuery();
        newURI = newURI.trimSegments(newURI.segmentCount()).appendSegment(id).appendQuery("rev=" + rev);
        resource.setURI(newURI);
    }
}