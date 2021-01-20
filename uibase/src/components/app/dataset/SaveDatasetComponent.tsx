import * as React from 'react';
import {WithTranslation, withTranslation} from 'react-i18next';
import Ecore, {EObject, Resource} from "ecore";
import {API} from "../../../modules/api";
import {paramType} from "./DatasetView";
import {NeoButton, NeoCol, NeoInput, NeoRow, NeoTypography} from "neo-design/lib";
import _ from "lodash"

interface Props extends WithTranslation {
    closeModal: () => void;
    onSave?: (name: string) => void;
    viewObject: Ecore.EObject;
    currentDatasetComponent?: Ecore.EObject;
    defaultDatasetComponent?: Ecore.EObject;
    context: any;
}

interface State {
    changeCurrent: boolean;
    accessPublic: boolean;
    componentName: string;
    queryFilterPattern?: EObject;
    queryAggregatePattern?: EObject;
    querySortPattern?: EObject;
    queryGroupByPattern?: EObject;
    queryGroupByColumnPattern?: EObject;
    queryCalculatedExpressionPattern?: EObject;
    hiddenColumnPattern?: EObject;
    diagramPatter?: EObject;
    highlightPattern?: EObject;
    user?: EObject;
}

class SaveDatasetComponent extends React.Component<Props, State> {

    constructor(props: any) {
        super(props);
        this.state = {
            changeCurrent: false,
            accessPublic: true,
            componentName: ''
        };
    }

    onClick(): void {
        if (this.state.componentName !== "" || (this.state.changeCurrent
            && !(this.props.defaultDatasetComponent?.eContents()[0].get('name') === this.props.currentDatasetComponent?.eContents()[0].get('name')))) {
            this.saveDatasetComponentOptions();
        } else if (this.state.componentName === "") {
            this.props.context.notification(this.props.t("DatasetComponent"),
                this.props.t("component name is empty"),
                "error")
        } else if (this.props.defaultDatasetComponent?.eContents()[0].get('name') === this.props.currentDatasetComponent?.eContents()[0].get('name')) {
            this.props.context.notification(this.props.t("DatasetComponent"),
                this.props.t("cant change default profile"),
                "error")
        }
    }

    getPattern(className:string, paramName:string) {
        API.instance().findClass('dataset', className)
            .then( (paramValue: EObject ) => {
                this.setState<never>({
                    [paramName]: paramValue
                })
            })
    };

    getUser() {
        API.instance().fetchAllClasses(false).then(classes => {
            const temp = classes.find((c: Ecore.EObject) => c._id === '//User')
            if (temp !== undefined) {
                API.instance().findByKind(temp,  {contents: {eClass: temp.eURI()}})
                    .then((users: Ecore.Resource[]) => {
                        this.props.context.userProfilePromise.then((userProfile: Ecore.Resource) => {
                            const user = users.find( (u: Ecore.Resource) => u.eContents()[0].get('name') === userProfile.eContents()[0].get('userName'));
                            this.setState({user})
                        });
                    })
            }
        })
    };

    addComponentServerParam(currentDatasetComponent: Ecore.EObject, pattern: Ecore.EObject, userProfileValue: Ecore.EObject[], paramName: string, componentName: string): void {
        currentDatasetComponent.get(componentName).clear();
        JSON.parse(userProfileValue[0].get('value'))[paramName].forEach((f: any) => {
            if (f['operation'] !== undefined || (componentName === 'groupByColumn' && f['datasetColumn'] !== undefined) || paramName === paramType.hiddenColumns) {
                let params;
                params = pattern.create({
                    datasetColumn: f['datasetColumn'],
                    operation: f['operation'],
                    value: f['value'],
                    enable: f['enable'],
                    dataType: f['type'],
                    mask: f['mask'],
                    highlightType: f['highlightType'],
                    backgroundColor: f['backgroundColor'],
                    color: f['color']
                });
                currentDatasetComponent.get(componentName).add(params)
            }
        })
    };

    addComponentDiagram(currentDatasetComponent: Ecore.EObject, pattern: Ecore.EObject, userProfileValue: Ecore.EObject[], paramName: string, componentName: string): void {
        currentDatasetComponent.get(componentName).clear();
        JSON.parse(userProfileValue[0].get('value'))[paramName].forEach((f: any) => {
            let params;
            params = pattern.create({
                diagramName: f['diagramName'],
                diagramType: f['diagramType'],
                axisXLegend: f['axisXLegend'],
                axisYLegend: f['axisYLegend'],
                axisXPosition: f['axisXPosition'],
                axisYPosition: f['axisYPosition'],
                legendAnchorPosition: f['legendAnchorPosition'],
                indexBy: f['indexBy'],
                keyColumn: f['keyColumn'],
                valueColumn: f['valueColumn'],
                diagramLegend: f['diagramLegend'],
            });
            currentDatasetComponent.get(componentName).add(params)
        })
    };

    saveDatasetComponentOptions(): void {
        let objectId = this.props.viewObject.eURI();
        let params: any = {name: this.state.componentName};
        this.props.context.changeUserProfile(objectId, params);
        let currentDatasetComponent = _.cloneDeepWith(this.props.currentDatasetComponent?.eContents()[0])
        if (currentDatasetComponent !== undefined) {
            currentDatasetComponent.set('access', !this.state.accessPublic ? 'Private' : 'Public');
            if (!this.state.changeCurrent) {
                currentDatasetComponent.get('audit').get('createdBy', null);
                currentDatasetComponent.get('audit').set('created', null);
                currentDatasetComponent.get('audit').set('modifiedBy', null);
                currentDatasetComponent.get('audit').set('modified', null);
            }
            this.props.context.userProfilePromise.then((userProfile: Ecore.Resource) => {
                if (currentDatasetComponent !== undefined) {
                    const userProfileValue = userProfile.eContents()[0].get('params').array()
                        .filter( (p: any) => p.get('key') === currentDatasetComponent?.eURI());
                    if (userProfileValue.length !== 0) {
                        this.addComponentServerParam(currentDatasetComponent, this.state.queryFilterPattern!, userProfileValue, 'serverFilters', 'serverFilter');
                        this.addComponentServerParam(currentDatasetComponent, this.state.queryAggregatePattern!, userProfileValue, 'serverAggregates', 'serverAggregation');
                        this.addComponentServerParam(currentDatasetComponent, this.state.querySortPattern!, userProfileValue, 'serverSorts', 'serverSort');
                        this.addComponentServerParam(currentDatasetComponent, this.state.queryGroupByPattern!, userProfileValue, 'serverGroupBy', 'serverGroupBy');
                        this.addComponentServerParam(currentDatasetComponent, this.state.queryCalculatedExpressionPattern!, userProfileValue, 'serverCalculatedExpression', 'serverCalculatedExpression');
                        this.addComponentServerParam(currentDatasetComponent, this.state.highlightPattern!, userProfileValue, 'highlights', 'highlight');
                        this.addComponentServerParam(currentDatasetComponent, this.state.queryGroupByColumnPattern!, userProfileValue, 'groupByColumn', 'groupByColumn');
                        this.addComponentServerParam(currentDatasetComponent, this.state.hiddenColumnPattern!, userProfileValue, 'hiddenColumns', 'hiddenColumn');
                        this.addComponentDiagram(currentDatasetComponent, this.state.diagramPatter!, userProfileValue, 'diagrams', 'diagram');
                    }
                    this.props.context.changeUserProfile(currentDatasetComponent.eURI(), undefined);

                    this.props.context.userProfilePromise.then((userProfile: Ecore.Resource) => {
                        const resource = currentDatasetComponent?.eResource();
                        if (resource) {
                            if (!this.state.changeCurrent) {
                                const contents = (eObject: EObject): EObject[] => [eObject, ...eObject.eContents().flatMap(contents)];
                                contents(resource.eContents()[0]).forEach(eObject=>{(eObject as any)._id = null});
                                resource.eContents()[0].set('name', `${this.state.componentName}`);
                                resource.set('uri', null);
                                resource.eContents()[0].set('serverFilters', `${this.state.componentName}`);
                                this.props.context.changeUserProfile(this.props.viewObject.eURI(), {name: this.state.componentName})
                            }
                            this.saveDatasetComponent(resource);
                        }
                    })
                }
            });
        }
    }

    private saveDatasetComponent(resource: Resource) {
        API.instance().saveResource(resource)
            .then((newDatasetComponent: any) => {
                this.props.closeModal!();
                const newResourceSet: Ecore.ResourceSet = this.props.viewObject.eResource().eContainer as Ecore.ResourceSet;
                const newViewObject: Ecore.EObject[] = newResourceSet.elements()
                    .filter((r: Ecore.EObject) => r.eContainingFeature.get('name') === 'view')
                    .filter((r: Ecore.EObject) => r.eContainingFeature._id === this.props.context.viewObject.eContainingFeature._id)
                    .filter((r: Ecore.EObject) => r.eContainer.get('name') === this.props.context.viewObject.eContainer.get('name'))
                this.props.context.updateContext!(({viewObject: newViewObject[0]}), this.props.onSave && this.props.onSave(newDatasetComponent.eContents()[0].get('name')));
            });
    }

    onChangeName(e: any): void {
        this.setState({componentName: e})
    }

    onChangeCurrent(): void {
        this.state.changeCurrent ? this.setState({changeCurrent: false}) : this.setState({changeCurrent: true})
    }

    onChangeAccess(): void {
        this.state.accessPublic ? this.setState({accessPublic: false}) : this.setState({accessPublic: true})
    }

    componentDidMount(): void {
        if (!this.state.queryFilterPattern) this.getPattern('QueryFilter', 'queryFilterPattern');
        if (!this.state.queryAggregatePattern) this.getPattern('QueryAggregate', 'queryAggregatePattern');
        if (!this.state.querySortPattern) this.getPattern('QuerySort', 'querySortPattern');
        if (!this.state.queryGroupByPattern) this.getPattern('QueryGroupBy', 'queryGroupByPattern');
        if (!this.state.queryCalculatedExpressionPattern) this.getPattern('QueryCalculatedExpression', 'queryCalculatedExpressionPattern');
        if (!this.state.highlightPattern) this.getPattern('Highlight', 'highlightPattern');
        if (!this.state.queryGroupByColumnPattern) this.getPattern('QueryGroupByColumn', 'queryGroupByColumnPattern');
        if (!this.state.diagramPatter) this.getPattern('Diagram', 'diagramPatter');
        if (!this.state.hiddenColumnPattern) this.getPattern('HiddenColumn','hiddenColumnPattern');
        if (!this.state.user) this.getUser();
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
        if (this.props.currentDatasetComponent?.eContents()[0].get('name') !== prevProps.currentDatasetComponent?.eContents()[0].get('name')) {
            //reset checkbox on change
            this.setState({changeCurrent: false, accessPublic: true})
        }
    }

    render() {
        const { t } = this.props;

        return (
            <div>
                <NeoRow>
                    <NeoCol span={24} style={{alignItems:'start', marginBottom:'17px', flexDirection:'column'}}>
                        <NeoInput
                            width={'100%'}
                            placeholder={t('label')}
                            disabled={this.state.changeCurrent}
                            style={{ marginBottom: '20px'}}
                            allowClear={true}
                            onChange={(e: any) => this.onChangeName(e.target.value)}
                        />
                    </NeoCol>
                </NeoRow>
                <NeoRow style={{justifyContent:'flex-start'}}>
                    <NeoCol span={12} style={{alignItems:'start', flexDirection:'column'}}>
                        <NeoInput
                            type={'checkbox'}
                            checked={this.state.changeCurrent}
                            disabled={this.props.defaultDatasetComponent?.eContents()[0].get('name') === this.props.currentDatasetComponent?.eContents()[0].get('name')}
                            onChange={() => this.onChangeCurrent()}
                        >
                            <NeoTypography type={'capture_regular'} style={{color : "#333333", marginTop: "5px"}}>{t('change current')}</NeoTypography>
                        </NeoInput>
                        <NeoInput
                            type={'checkbox'}
                            checked={this.state.accessPublic}
                            disabled={false}
                            onChange={() => this.onChangeAccess()}
                        >
                            <NeoTypography type={'capture_regular'} style={{color : "#333333", marginTop: "5px"}}> {t('public')}</NeoTypography>
                        </NeoInput>
                    </NeoCol>
                </NeoRow>
                <NeoRow style={{marginTop:'15px', justifyContent:'flex-start'}}>
                    <NeoButton style={{width:'120px', marginRight:'16px'}} onClick={() => this.onClick()}>
                        {t('save')}
                    </NeoButton>
                    <NeoButton type={"secondary"} style={{ width:'120px', color: 'fff'}} onClick={() => this.props.closeModal()}>
                        {t('cancel')}
                    </NeoButton>
                </NeoRow>
            </div>

        )
    }
}

export default withTranslation()(SaveDatasetComponent)
