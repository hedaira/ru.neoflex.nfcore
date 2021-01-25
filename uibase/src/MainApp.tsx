import * as React from "react";
import {Helmet} from 'react-helmet';
import Splitter from './components/CustomSplitter'
import {Layout, Menu} from "antd";
import './styles/MainApp.css'
import {API} from "./modules/api";
import Ecore from "ecore"
import {ViewRegistry} from './ViewRegistry'
import FetchSpinner from "./components/FetchSpinner";
import {grantType} from "./utils/consts";
import SubMenu from "antd/es/menu/SubMenu";
import {adaptiveElementSize, breakPointsSizePx, getAdaptiveSize} from "./utils/adaptiveResizeUtils";
import {NeoButton, NeoColor, NeoParagraph, NeoTable, NeoTabs} from "neo-design/lib";
import {NeoIcon} from "neo-icon/lib";
import ConfigUrlElement from "./ConfigUrlElement";
import _ from "lodash";

interface State {
    pathBreadcrumb: string[];
    openKeys: string[];
    hideReferences: boolean;
    hideLog: boolean;
    hideURL: boolean;
    currentTool?: string;
    objectApp?: Ecore.EObject;
    eClassAppModule?: Ecore.EObject;
    log: string;
    activeTab: string;
    urlTableHeight: number;
}


const FooterHeight = '40px';
const backgroundColor = "#fdfdfd";
const defaultVerticalSplitterSize = "300px";
const defaultHorizontalSplitterSize = "400px";
const verticalSplitterShortSize = `${breakPointsSizePx.referenceMenu[0]}px`;

function getVerticalStoredSize() {
    return localStorage.getItem('mainapp_refsplitter_pos') || defaultVerticalSplitterSize;
}

function setVerticalStoredSize(size = defaultVerticalSplitterSize) {
    if (parseInt(size) < 0) {
        localStorage.setItem('mainapp_refsplitter_pos', "0px")
    } else {
        localStorage.setItem('mainapp_refsplitter_pos', size)
    }
}


function getHorizontalStoredSize() {
    return localStorage.getItem('mainapp_toolssplitter_pos') || defaultHorizontalSplitterSize;
}

function setHorizontalStoredSize(size = defaultHorizontalSplitterSize) {
    if (parseInt(size) < 0) {
        localStorage.setItem('mainapp_toolssplitter_pos', "0px")
    } else {
        localStorage.setItem('mainapp_toolssplitter_pos', size)
    }
}

function splitLog(log:string) {
    let arr:string[] = [];
    let pos = 1;
    while (pos !== -1) {
        //Делим по тайм коду сообщений
        pos = log.search(new RegExp("\\n[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}[ ]+[a-zA-Z]+ "));
        arr.push(log.substring(0, pos));
        log = log.substring(pos+1);
    }
    return arr
}

function getOpenedPath(arr: string[]) : string[] {
    if (arr.length === 1) {
        return arr
    }
    const path = arr[arr.length - 1];
    return arr.filter(s=>path && ((path.search(s + "/") >= 0) || path === s))
}

function mountStyleSheets(styleSheetsList?: Ecore.EList) {
    styleSheetsList?.each(o=>{
        let sheet = document.getElementById(o.get('name'));
        if (!sheet) {
            sheet = document.createElement('style');
            sheet.innerHTML = o.get('sheetContent');
            sheet.id = o.get('name');
            document.body.appendChild(sheet);
        }
    });
}

function unmountStyleSheets(styleSheetsList?: Ecore.EList) {
    styleSheetsList?.each(o=>{
        const sheet = document.getElementById(o.get('name'));
        sheet && document.body.removeChild(sheet);
    });
}

export class MainApp extends React.Component<any, State> {
    private refSplitterRef: React.RefObject<any> = React.createRef();
    private toolsSplitterRef: React.RefObject<any> = React.createRef();
    private debugRef: React.RefObject<HTMLDivElement> = React.createRef();
    private viewFactory = ViewRegistry.INSTANCE.get('antd');
    private appModuleMap:Map<string,string[]>;

    constructor(props: any) {
        super(props);
        this.appModuleMap = new Map<string,string[]>();
        this.state = {
            pathBreadcrumb: [],
            openKeys: [],
            hideReferences: true,
            hideLog: true,
            hideURL: true,
            log: "",
            activeTab: "",
            urlTableHeight: 0
        }
    }

    getEClassAppModule(): void {
        API.instance().fetchAllClasses(false).then(classes => {
            const eClass = classes.find((c: Ecore.EObject) => c._id === "//AppModule") as Ecore.EClass;
            this.setState({eClassAppModule: eClass});
            this.loadObject()
        })
    }

    loadObject = () => {
        function parseTree(tree: string[]) {
            return tree.map((value, index) => {
                return index === 0 ? value : value.replace(tree[index-1]+"/","")
            })
        }
        function findTreeOpenKeys(refTree: Ecore.EObject, appModuleName: string, retArr: string[] = []) {
            if (refTree.get('children')) {
                (refTree.get('children') as Ecore.EList).each(t => {
                    if (retArr.length === 0 || retArr[retArr.length - 1] !== appModuleName) {
                        retArr.push(retArr.length > 1 ? retArr[retArr.length - 1]+"/"+refTree.get('name') : refTree.get('name'));
                        findTreeOpenKeys(t, appModuleName, retArr);
                    }
                })
            } else if (refTree.get('AppModule')?.get('name') === appModuleName) {
                retArr.push(appModuleName);
                return retArr
            }
            return retArr.length > 2 && retArr[retArr.length - 1] === appModuleName
                ? retArr.slice(1, retArr.length - 1)
                : []
        }
        let name: string;
        if (this.props.appModuleName !== undefined) {
            name = decodeURI(this.props.appModuleName);
            if (this.state.eClassAppModule) {
                API.instance().findByKindAndName(this.state.eClassAppModule, name, 999).then(resources => {
                    if (resources.length > 0) {
                        const objectApp = resources[0].eContents()[0];
                        let currentAppModule = this.props.pathFull[this.props.pathFull.length - 1];
                        if (currentAppModule.tree.length === 0) {
                            this.setState({objectApp}, () => {
                                if (objectApp.get('referenceTree') === null) {
                                    if (currentAppModule.useParentReferenceTree) {
                                        this.props.context.updateContext!(
                                            ({
                                                viewObject: objectApp.get('view'),
                                                variableList: objectApp.get('variables'),
                                                eventHandlerList: objectApp.get('eventHandlers'),
                                                groovyCommandList: objectApp.get('groovyCommands'),
                                                styleSheetsList: objectApp.get('styleSheets'),
                                            })
                                        );
                                        let app = this.props.pathFull.filter((p: any) => !p.useParentReferenceTree);
                                        if (app.length !== 0 && this.props.context.applicationReferenceTree === undefined) {
                                            this.setReferenceTree(app[app.length - 1].appModule)
                                        }
                                    } else {
                                        this.props.context.updateContext!(
                                            ({
                                                viewObject: objectApp.get('view'),
                                                variableList: objectApp.get('variables'),
                                                eventHandlerList: objectApp.get('eventHandlers'),
                                                groovyCommandList: objectApp.get('groovyCommands'),
                                                styleSheetsList: objectApp.get('styleSheets'),
                                                applicationReferenceTree: undefined}),
                                            ()=>this.setVerticalSplitterWidth(this.refSplitterRef.current.panePrimary.props.style.minWidth)
                                        );
                                        this.setState({hideReferences: true})
                                    }
                                } else {
                                    this.props.context.updateContext!(
                                        ({
                                            viewObject: objectApp.get('view'),
                                            variableList: objectApp.get('variables'),
                                            eventHandlerList: objectApp.get('eventHandlers'),
                                            groovyCommandList: objectApp.get('groovyCommands'),
                                            styleSheetsList: objectApp.get('styleSheets'),
                                            applicationReferenceTree: objectApp.get('referenceTree')
                                        }), this.setState({openKeys:findTreeOpenKeys(objectApp.get('referenceTree'), currentAppModule.appModule)})
                                    );
                                    if (this.props.pathFull.length !== 1) {
                                        this.setState({hideReferences: parseInt(getVerticalStoredSize()) <= parseInt(verticalSplitterShortSize)},
                                            ()=>this.setVerticalSplitterWidth(getVerticalStoredSize()));
                                    }
                                }
                            })
                        } else {
                            if (objectApp.get('referenceTree') === null) {
                                if (currentAppModule.useParentReferenceTree) {
                                    this.props.context.updateContext!(
                                        ({
                                            viewObject: objectApp.get('view'),
                                            variableList: objectApp.get('variables'),
                                            eventHandlerList: objectApp.get('eventHandlers'),
                                            styleSheetsList: objectApp.get('styleSheets'),
                                            groovyCommandList: objectApp.get('groovyCommands'),
                                        })
                                    );
                                    let app = this.props.pathFull.filter((p: any) => !p.useParentReferenceTree);
                                    if (app.length !== 0 && this.props.context.applicationReferenceTree === undefined) {
                                        this.setReferenceTree(app[app.length - 1].appModule)
                                    }
                                } else {
                                    this.props.context.updateContext!(
                                        ({
                                            viewObject: objectApp.get('view'),
                                            variableList: objectApp.get('variables'),
                                            eventHandlerList: objectApp.get('eventHandlers'),
                                            groovyCommandList: objectApp.get('groovyCommands'),
                                            styleSheetsList: objectApp.get('styleSheets'),
                                            applicationReferenceTree: undefined
                                        }),
                                        ()=>this.setVerticalSplitterWidth(this.refSplitterRef.current.panePrimary.props.style.minWidth)
                                    );
                                    this.setState({hideReferences: true})
                                }
                            }
                            else {
                                let treeChildren = objectApp.get('referenceTree').eContents();
                                let currentAppModule = this.props.pathFull[this.props.pathFull.length - 1];
                                if (objectApp.get('name') === currentAppModule.appModule) {
                                    let currentTree: any[] = parseTree(currentAppModule['tree']);
                                    for (let i = 0; i <= currentTree.length - 1; i++) {
                                        for (let t of treeChildren
                                            .filter((t: any) => t.get('name') === currentTree[i])) {
                                            if (t.eContents().length !== 0) {
                                                treeChildren = t.eContents();
                                            }
                                            if (t.get('AppModule') !== undefined && t.get('AppModule').get('name') === currentAppModule.appModule) {
                                                treeChildren = t.get('AppModule').get('view')
                                            }
                                        }
                                    }
                                    this.props.context.updateContext!(
                                        ({
                                            viewObject: treeChildren[0] || treeChildren,
                                            applicationReferenceTree: objectApp.get('referenceTree'),
                                            variableList: objectApp.get('variables'),
                                            eventHandlerList: objectApp.get('eventHandlers'),
                                            groovyCommandList: objectApp.get('groovyCommands'),
                                            styleSheetsList: objectApp.get('styleSheets'),
                                        })
                                    );
                                }
                                else {
                                    this.props.context.updateContext!(
                                        ({
                                            viewObject: objectApp.get('view'),
                                            applicationReferenceTree: objectApp.get('referenceTree'),
                                            variableList: objectApp.get('variables'),
                                            eventHandlerList: objectApp.get('eventHandlers'),
                                            groovyCommandList: objectApp.get('groovyCommands'),
                                            styleSheetsList: objectApp.get('styleSheets'),
                                        })
                                    );
                                }
                            }
                        }
                        if (objectApp.get('referenceTree') !== null && objectApp.get('referenceTree').eContents().length !== 0) {
                            this.setState({hideReferences: parseInt(getVerticalStoredSize()) <= parseInt(verticalSplitterShortSize)},
                                ()=>this.setVerticalSplitterWidth(getVerticalStoredSize()))
                        }
                    }
                })
            }
        }
    };

    setReferenceTree = (appModuleName: string) => {
        if (this.state.eClassAppModule !== undefined) {
            API.instance().findByKindAndName(this.state.eClassAppModule, appModuleName, 999).then(resources => {
                if (resources.length > 0) {
                    const objectApp = resources[0].eContents()[0];
                    this.props.context.updateContext!(({applicationReferenceTree: objectApp.get('referenceTree')}));
                    this.setState({hideReferences: parseInt(getVerticalStoredSize()) <= parseInt(verticalSplitterShortSize)})
                }
            })
        }
    };

    componentDidUpdate(prevProps: any, prevState: any): void {
        if (this.props.context.viewObject !== undefined && this.props.context.viewObject !== null) {
            if (this.props.context.viewObject.eResource().eContents()[0].get('name') !== this.props.pathFull[0].appModule
                && this.props.context.viewObject.eResource().eContents()[0].eClass.get('name') === 'Application') {
                this.props.context.updateContext!(({viewObject: undefined, applicationReferenceTree: undefined}))
            }
        }
        if (prevProps.location.pathname !== this.props.location.pathname) {
            this.loadObject()
        }
        if (this.props.context !== prevProps.context) {
            //В момент инициализации даем понять адаптивным элементам что нужно пересчитать размеры
            window.dispatchEvent(new Event('appAdaptiveResize'));
        }
        if (!_.isEqual(this.props.context?.styleSheetsList?.array(), prevProps.context?.styleSheetsList?.array())) {
            //in case we change url outside appModule reference tree
            unmountStyleSheets(prevProps.context.styleSheetsList)
        }
    }


    handleResize = () => {
        const hideReferences = getAdaptiveSize(this.refSplitterRef.current.panePrimary.div.offsetWidth ? this.refSplitterRef.current.panePrimary.div.offsetWidth : 0, "referenceMenu") <= adaptiveElementSize.extraSmall;
        if (hideReferences !== this.state.hideReferences && this.refSplitterRef.current.panePrimary.div.offsetWidth) {
            this.setState({hideReferences})
        }
    };

    componentDidMount(): void {
        this.getEClassAppModule();
        window.addEventListener("appAdaptiveResize", this.handleResize);
        window.addEventListener("resize", this.handleResize);
        const currentAppModule = this.props.pathFull[this.props.pathFull.length - 1];
        this.setState({openKeys: currentAppModule.tree && currentAppModule.tree.length > 0
                ? currentAppModule.tree
                : this.appModuleMap.get(currentAppModule.appModule)
                    ? this.appModuleMap.get(currentAppModule.appModule)
                    : [] })
    }

    componentWillUnmount() {
        //in case we change url outside appModule reference tree
        unmountStyleSheets(this.props.context.styleSheetsList);
        window.removeEventListener("appAdaptiveResize", this.handleResize);
        window.removeEventListener("resize", this.handleResize);
    }

    setVerticalSplitterWidth = (width:string, minWidth?:string, maxWidth: string = "50%") => {
        if (!minWidth) {
            minWidth = this.refSplitterRef.current.panePrimary.props.style.minWidth;
        }
        this.refSplitterRef.current.panePrimary.div.setAttribute("style",
            `width: ${width}; min-width: ${minWidth}; max-width: ${maxWidth}`);
    };

    renderFooter = () => {
        return (
            <div className={"application-footer"}>
                {this.props.context.isDeveloper() && <NeoTabs className={"debug-tabs-pane"} activeKey={this.state.activeTab}>
                    <NeoTabs.NeoTabPane key={"log"} tab={<NeoButton
                        className={"debug-item"}
                        style={{color:this.state.hideLog ? NeoColor.violete_4 : NeoColor.violete_6}}
                        title={this.state.hideLog ? this.props.t("show log") : this.props.t("hide log")}
                        onClick={()=>{
                            this.setState({hideLog:!this.state.hideLog, hideURL: true, activeTab: this.state.activeTab === "log" ? "" : "log"});
                            API.instance().fetchLog().then(log=>{
                                this.setState({log:log}, ()=>{
                                    if (this.debugRef.current) {
                                        this.debugRef.current.scrollIntoView({ behavior: "smooth" , block: "end" })
                                    }
                                })
                            })
                        }}
                        type={"link"}>
                        <NeoIcon color={this.state.hideLog ? NeoColor.violete_4 : NeoColor.violete_6} icon={"code"} />{this.props.t("Logs")}
                    </NeoButton>}/>
                    <NeoTabs.NeoTabPane key={"url"} tab={<NeoButton
                        className={"debug-item"}
                        style={{color:this.state.hideURL ? NeoColor.violete_4 : NeoColor.violete_6}}
                        title={this.state.hideURL ? this.props.t("show url decode") : this.props.t("show url decode")}
                        onClick={()=>this.setState({hideLog: true, hideURL:!this.state.hideURL, activeTab: this.state.activeTab === "url" ? "" : "url"}, ()=>{
                            if (this.debugRef.current) {
                                this.debugRef.current.scrollIntoView(true)
                            }
                        })}
                        type={"link"}>
                        <NeoIcon color={this.state.hideURL ? NeoColor.violete_4 : NeoColor.violete_6} icon={"cloudServer"} />URL
                    </NeoButton>}/>
                </NeoTabs>}
            </div>
        )
    };

    renderDebugContent = () => {
        let children = null;
        let content = null;
        if (!this.state.hideLog) {
            children = <div id={"logContent"} ref={this.debugRef}>
                {splitLog(this.state.log).map((str, index)=>{
                    str = str.replace("  "," ");
                    let arr = str.slice(24).split(" ");
                    arr.splice(1,0, str.substring(0,23));
                    return <div key={`logEntry${index}`} style={{color: arr[0] === "ERROR" ? NeoColor.magenta_4 : undefined, display: "inline-flex"}}>
                        <div style={{color: arr[0] === "ERROR" ? NeoColor.magenta_4 : NeoColor.violete_5, minWidth: "60px"}}>{arr[0]}</div>
                        <div style={{color: arr[0] === "ERROR" ? NeoColor.magenta_4 : NeoColor.grey_8, whiteSpace: "nowrap"}}>{arr[1]}</div>
                        <div style={{color: arr[0] === "ERROR" ? NeoColor.magenta_4 : NeoColor.grey_8, whiteSpace: "pre-wrap"}}>{arr.splice(2).join(" ")}</div>
                    </div>
                })}
                </div>;
            content = <div id={"debugContainer"}>
                <div id={"debugInnerBar"}>
                    <NeoButton type={"link"} onClick={()=>!this.state.hideLog && this.setState({hideLog:true, activeTab:""})}><NeoIcon color={NeoColor.violete_4} icon={"close"}/></NeoButton>
                    <NeoButton type={"link"} onClick={()=>!this.state.hideLog && this.setState({log:""})}><NeoIcon color={NeoColor.violete_4} icon={"rubbish"}/></NeoButton>
                </div>
                {children}
            </div>
        } else if (!this.state.hideURL) {
            const urlParams:ConfigUrlElement[] = this.props.context.getFullPath();
            const dataSource = urlParams.map((up,index)=>{
                return {
                    key: index,
                    appModule: up.appModule ? up.appModule : "null",
                    treeNode: up.tree.length > 0 && up.tree[up.tree.length - 1],
                    useParentReferenceTree: up.useParentReferenceTree ? up.useParentReferenceTree.toString() : "",
                    parameters: up.params && up.params.length > 0 && up.params.map((p, paramIndex)=>{
                        return <p key={`p${index}${paramIndex}`}>name: <b>{p.parameterName}</b>, value: <b>{p.parameterValue ? p.parameterValue : "null"}</b>, data type: <b>{p.parameterDataType ? p.parameterDataType : "String"}</b>;</p>
                    })
                }
            });
            content = <div id={"debugContainer"} className={"url"}>
                <div id={"debugInnerBar"} >
                    <NeoButton type={"link"} onClick={()=>!this.state.hideURL && this.setState({hideURL:true, activeTab:""})}><NeoIcon color={NeoColor.violete_4} icon={"close"}/></NeoButton>
                </div>
                <NeoTable
                    className={"url-content"}
                    size={"small"}
                    pagination={false}
                    columns={[
                        {title: "App module", dataIndex: "appModule", key: "appModule", width: "15%"},
                        {title: "Tree node", dataIndex: "treeNode", key: "treeNode", width: "30%"},
                        {title: "Use parent reference tree", dataIndex: "useParentReferenceTree", key: "useParentReferenceTree", width: "15%"},
                        {title: "Parameters", dataIndex: "parameters", key: "parameters", width: "40%", render: (text:any, record:any) => {
                                return <div>{record.parameters}</div>}}
                    ]}
                    dataSource={dataSource}
                />
            </div>
        }
        return content
    };

    renderContent = () => {
        mountStyleSheets(this.props.context.styleSheetsList);
        return this.props.context.viewObject && this.viewFactory.createView(this.props.context.viewObject, this.props)
    };

    renderEList = (list: Ecore.EList) => {
        return list && list.array().map(v=>{
            return this.viewFactory.createView(v, this.props)
        })
    };

    renderReferences = (isShortSize = false) => {
        const {context} = this.props;
        const {applicationReferenceTree, viewReferenceTree} = context;
        const referenceTree = viewReferenceTree || applicationReferenceTree;
        const cbs = new Map<string, () => void>();
        const currentAppModule = this.props.pathFull[this.props.pathFull.length - 1];
        const pathReferenceTree = currentAppModule.tree && currentAppModule.tree.length > 0
            ? currentAppModule.tree[currentAppModule.tree.length - 1]
            : this.appModuleMap.get(currentAppModule.appModule) && this.appModuleMap.get(currentAppModule.appModule)![this.appModuleMap.get(currentAppModule.appModule)!.length - 1];
        return !referenceTree ? null : (
            <Layout style={{backgroundColor: backgroundColor}}>
                <Menu
                    id={"referenceTree"}
                    inlineIndent={12}
                    className={`${isShortSize && "short-size"}`}
                    openKeys={this.state.hideReferences || isShortSize ? [] : this.state.openKeys}
                    selectedKeys={pathReferenceTree ? [pathReferenceTree] : undefined}
                    onSelect={params => {
                        const cb = cbs.get(params.key);
                        if (cb) cb();
                    }}
                    onOpenChange={openKeys => {
                        this.setState({openKeys: getOpenedPath(openKeys)});
                        //Восстанавливаем ширину если были в свернутом виде
                        if (this.state.hideReferences) {
                            setVerticalStoredSize(defaultVerticalSplitterSize);
                            this.setVerticalSplitterWidth(getVerticalStoredSize())
                        }
                    }}
                    mode="inline"
                >
                    {referenceTree.get('children')
                        .filter((c: Ecore.EObject)=> (isShortSize && c.get('icon')) || !isShortSize)
                        .map((c: Ecore.EObject) => this.renderTreeNode(c, cbs, undefined, isShortSize))}
                </Menu>
            </Layout>
        )
    };

    renderTreeNode = (eObject: Ecore.EObject, cbs: Map<string, () => void>, parentKey?: string, isShortSize = false) => {
        const code = eObject.get('name');
        const key = parentKey ? parentKey + '/' + code : code;
        // eslint-disable-next-line
        const icon = eObject.get('icon') && this.viewFactory.createView(eObject.get('icon'), this.props);
        const content = isShortSize ? <div className={`menu-content ${icon && "menu-with-icon"}`}>{icon}</div> : <div className={`menu-content ${icon && "menu-with-icon"}`}>{icon}<span>{code}</span></div>;
        let children = [];
        if (eObject.get('children')) {
            children = eObject.get('children')
                .map((c: Ecore.EObject) =>
                    this.renderTreeNode(c, cbs, key));
        }

        const isLeaf = !eObject.isKindOf('CatalogNode');

        if (eObject.isKindOf('AppModuleNode')) {
            cbs.set(key, () => {
                if (eObject.get('AppModule')) {
                    this.setURL(eObject, this.state.openKeys.concat(key));
                }
            });
            if (eObject.get('AppModule'))
                this.appModuleMap.set(eObject.get('AppModule').get('name'), this.state.openKeys.concat(key));
        }
        else if (eObject.isKindOf('ViewNode') ) {
            cbs.set(key, () => {
                if (eObject.get('view')) {
                    this.setURL(eObject, this.state.openKeys.concat(key));
                }
            })
        }
        else if (eObject.isKindOf('EClassNode')) {
            cbs.set(key, () => {
                if (eObject.get('aClass') && eObject.get('view')) {
                    this.setURL(eObject, this.state.openKeys.concat(key));
                }
            })
        }
        else if (eObject.isKindOf('DynamicNode')) {
            cbs.set(key, () => {
                if (eObject.get('methodName') && eObject.get('eObject')) {
                    this.setURL(eObject, this.state.openKeys.concat(key));
                }
            })
        }
        if (isShortSize) {
            const cb = cbs.get(key);
            cbs.set(key, () => {
                cb && cb();
            })
        }
        return eObject.get('grantType') === grantType.denied ? undefined : (
            isLeaf
                ? <Menu.Item className={icon ? "item-with-icon": "item-without-icon"} key={key}>{content}</Menu.Item>
                : <SubMenu className={icon ? "submenu-with-icon": "submenu-without-icon"} onTitleClick={()=>{isShortSize && this.setState({hideReferences: false})}} key={key} title={content}>{children}</SubMenu>
        )
    };

    private setURL(eObject: Ecore.EObject, keys: string[]) {
        const appModuleName = eObject.get('AppModule') ? eObject.get('AppModule').get('name') : this.props.pathFull[0].appModule;
        let tree = keys;
        let useParentReferenceTree = eObject.get('AppModule') !== undefined ? (eObject.get('AppModule').get('useParentReferenceTree') || false) : true;
        unmountStyleSheets(this.props.context.styleSheetsList);
        this.props.context.changeURL!(appModuleName, useParentReferenceTree, tree)
    }

    hideReferenceTree = () => {
        if (this.state.hideReferences) {
            const size = getVerticalStoredSize();
            this.setVerticalSplitterWidth(size && (parseInt(size) < parseInt(defaultVerticalSplitterSize)) ? defaultVerticalSplitterSize : size!);
            setVerticalStoredSize(size && (parseInt(size) < parseInt(defaultVerticalSplitterSize)) ? defaultVerticalSplitterSize : size!);
        } else {
            this.setVerticalSplitterWidth(this.refSplitterRef.current.panePrimary.props.style.minWidth);
            setVerticalStoredSize(this.refSplitterRef.current.panePrimary.props.style.minWidth);
        }
        this.setState({hideReferences: !this.state.hideReferences})
    };

    render = () => {
        const hasIcons: boolean = this.props.context.applicationReferenceTree
            && this.props.context.applicationReferenceTree.get('children').filter((c: Ecore.EObject)=> c.get('icon')).length > 0;
        return (
            <div style={{flexGrow: 1, height:"100%"}}>
                <Helmet>
                    <title>{this.props.showTabTitle ? this.props.appModuleName : undefined}</title>
                    <link rel="shortcut icon" type="image/png" href="/application.ico" />
                </Helmet>
                <FetchSpinner/>
                {this.renderEList(this.props.context.variableList)}
                {this.renderEList(this.props.context.groovyCommandList)}
                {this.renderEList(this.props.context.eventHandlerList)}
                <Splitter
                    allowResize={!this.state.hideReferences}
                    ref={this.refSplitterRef}
                    position="vertical"
                    primaryPaneMaxWidth="50%"
                    primaryPaneMinWidth={hasIcons ? verticalSplitterShortSize : "0px"}
                    primaryPaneWidth={hasIcons && this.state.hideReferences
                        ? verticalSplitterShortSize
                        : this.state.hideReferences
                            ? 0
                            : getVerticalStoredSize()}
                    dispatchResize={true}
                    postPoned={false}
                    onDragFinished={() => {
                        if (this.refSplitterRef.current) {
                            setVerticalStoredSize(this.refSplitterRef.current.panePrimary.props.style.width)
                        }
                    }}
                >
                    <div className={'left-splitter'} style={{flexGrow: 1, backgroundColor: backgroundColor, height: '100%'}}>
                        {this.renderReferences(this.state.hideReferences)}
                        {this.props.context.applicationReferenceTree && <div className={'references-tree-footer'}>
                            <NeoButton
                                className={"footer-item"}
                                title={this.state.hideReferences ? this.props.t("show menu") : this.props.t("hide menu")}
                                type={"link"}
                                onClick={this.hideReferenceTree}>
                                <NeoIcon color={NeoColor.grey_8} icon={this.state.hideReferences ? "table" : "arrowLong"} />
                                {!this.state.hideReferences && <NeoParagraph type={"body_regular"}>{this.props.t("hide menu")}</NeoParagraph>}
                            </NeoButton>
                        </div>}
                    </div>
                    <div style={{backgroundColor: backgroundColor, height: '100%'}}>
                        <div style={{height: `calc(100% - ${FooterHeight})`, width: '100%', overflow: 'hidden'}}>
                            <Splitter
                                ref={this.toolsSplitterRef}
                                position="horizontal"
                                primaryPaneMaxHeight="100%"
                                primaryPaneMinHeight="0%"
                                primaryPaneHeight={getHorizontalStoredSize()}
                                dispatchResize={true}
                                postPoned={false}
                                maximizedPrimaryPane={this.state.hideLog && this.state.hideURL}
                                allowResize={!(this.state.hideLog && this.state.hideURL)}
                                onDragFinished={() => {
                                    const size: string = this.toolsSplitterRef.current!.panePrimary.props.style.height;
                                    setHorizontalStoredSize(size);
                                }}
                            >
                                <div style={{zIndex: 10, backgroundColor: backgroundColor}}>
                                    <div style={{
                                        height: '100%',
                                        width: '100%',
                                        backgroundColor: backgroundColor
                                    }}>
                                        {
                                            this.props.context.viewObject === null
                                                ?
                                                this.renderContent()
                                                :
                                                this.props.context.viewObject === undefined ||
                                                this.props.context.viewObject.eResource().eContents()[0].get('name') !== this.props.pathFull[this.props.pathFull.length - 1].appModule
                                                    ?
                                                    undefined
                                                    : this.renderContent()
                                        }
                                    </div>
                                </div>
                                <div style={{
                                    height: '100%',
                                    width: '100%',
                                    backgroundColor: backgroundColor
                                }}>
                                    {this.renderDebugContent()}
                                </div>
                            </Splitter>
                        </div>
                        <div className={"application-footer-container"} style={{minHeight: `${FooterHeight}`}}>
                            {this.renderFooter()}
                        </div>
                    </div>
                </Splitter>
            </div>
        )
    }
}
