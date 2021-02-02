package ru.neoflex.nfcore.application.impl

import org.eclipse.emf.common.util.EList
import org.eclipse.emf.ecore.EObject
import org.eclipse.emf.ecore.resource.Resource
import ru.neoflex.nfcore.application.*
import ru.neoflex.nfcore.base.auth.GrantType
import ru.neoflex.nfcore.base.services.Authorization
import ru.neoflex.nfcore.base.services.Context
import ru.neoflex.nfcore.dataset.DatasetPackage
import ru.neoflex.nfcore.utils.Utils

import java.util.function.BiConsumer
import java.util.function.Consumer

class ApplicationPackageInit {
    def static processViewElement(ViewElement viewElement) {
        if (viewElement == null) return
        setViewElementGrantType(viewElement)
        if (viewElement instanceof ViewContainer) viewElement.children.each {c->processViewElement(c)}
    }

    private static void setViewElementGrantType(ViewElement viewElement) {
        viewElement.grantType = GrantType.WRITE
        if (viewElement.checkRights) {
            int grant = Context.current.authorization.isEObjectPermitted(viewElement)
            viewElement.grantType = Authorization.getGrantType(grant)
        }
    }

    def static setAllViewElementsGrantType(EObject eObject) {
        Iterator iterator = eObject.eAllContents()
        while (iterator.hasNext()) {
            EObject contained = iterator.next()
            if (contained instanceof ViewElement) {
                ViewElement viewElement = contained
                setViewElementGrantType(viewElement)
            }
        }
    }

    def static processTreeNode(TreeNode treeNode) {
        if (treeNode == null) return
        treeNode.grantType = GrantType.WRITE
        if (treeNode.checkRights) {
            int grant = Context.current.authorization.isEObjectPermitted(treeNode)
            treeNode.grantType = Authorization.getGrantType(grant)
        }
        if (treeNode instanceof CatalogNode) treeNode.children.each {c->processTreeNode(c)}
        else if (treeNode instanceof ViewNode) processViewElement(treeNode.view)
    }

    {
        def checkAllViewElementsRights = [DatasetPackage.eINSTANCE.getDatasetComponent()]
        Context.current.store.registerAfterLoad(new Consumer<Resource>() {
            @Override
            void accept(Resource resource) {
                for (eObject in resource.contents) {
                    if (eObject instanceof AppModule) {
                        processViewElement(eObject.view)
                        processTreeNode(eObject.referenceTree)
                        eObject.grantType = GrantType.WRITE
                        if (eObject.checkRights) {
                            int grant = Context.current.authorization.isEObjectPermitted(eObject)
                            eObject.grantType = Authorization.getGrantType(grant)
                        }
                    }
                    else if (checkAllViewElementsRights.any {it.isSuperTypeOf(eObject.eClass())}) {
                        setAllViewElementsGrantType(eObject)
                    }
                }
            }
        })
    }

    {
        Context.current.store.registerBeforeSave(new BiConsumer<Resource, Resource>() {
            @Override
            void accept(Resource oldResource, Resource resource) {
                int maxHeaderOrder = 0;
                if (resource.contents[0] instanceof Application) {
                    EList<Resource> allApplications = (EList<Resource>) Utils.findAllEClass(ApplicationPackage.Literals.APPLICATION);
                    for (int i = 0; i < allApplications.size(); i++) {
                        if (allApplications[i].contents[0].headerOrder > maxHeaderOrder) {
                            maxHeaderOrder = allApplications[i].contents[0].headerOrder
                        }
                    }
                        if (resource.contents[0].headerOrder == null) {
                            resource.contents[0].headerOrder = maxHeaderOrder + 1;
                        }

                }
            }
            })
}
}
