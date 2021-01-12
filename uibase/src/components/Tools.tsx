import * as React from "react";
import {API} from "../modules/api";
import 'brace/mode/json';
import 'brace/theme/tomorrow';
import {WithTranslation, withTranslation} from "react-i18next";
import SearchGrid from "./SearchGrid";
import Ecore from "ecore";
import FilesystemLookup from "./app/filesystem/FilesystemLookup";
import {Helmet} from "react-helmet";
// CSS
import './../styles/Tools.css';
import {NeoButton, NeoColor, NeoDrawer, NeoInput, NeoSelect, NeoTabs, NeoTag, NeoTypography} from "neo-design/lib";
import {NeoIcon} from "neo-icon/lib";
import {IMainContext} from "../MainContext";

interface Props {
    notification: IMainContext['notification']
}

interface State {
    fileName?: string,
    deployName?: string,
    drawerResourceVisible: boolean,
    withReferences: boolean,
    withDependents: boolean,
    recursiveDependents: boolean,
    resourceList: Ecore.Resource[],
    checkedFiles: string[],
    branchInfo: {
        current: string,
        default: string,
        branches: string[]
    },
    mdFileName?: string,
    sql?: string,
    currentBranch: {
        branch: string,
        key: string,
        isCurrent: boolean,
        isDefault: boolean
    }
    MDUploadArray: File[],
    filesUploadArray: File[],
}

class Tools extends React.Component<Props & WithTranslation, State> {

    fileSystemLookupRef = React.createRef<any>();
    deploySupplyInputRef = React.createRef<HTMLInputElement>();
    importObjectInputRef = React.createRef<HTMLInputElement>();
    importMDInputRef = React.createRef<HTMLInputElement>();

    state: State = {
        drawerResourceVisible: false,
        withReferences: false,
        withDependents: false,
        recursiveDependents: false,
        resourceList: [],
        checkedFiles: [],
        branchInfo: {
            current: "master",
            default: 'master',
            branches: ["master"]
        },
        currentBranch: {
            branch: "",
            key: "",
            isCurrent: false,
            isDefault: false
        },
        MDUploadArray: [],
        filesUploadArray: [],
    };

    componentDidMount(): void {
        this.fileSystemLookupRef = React.createRef();
        this.fetchBranchInfo()
    }

    componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<State>, snapshot?: any): void {
    }

    fetchBranchInfo = () => {
        API.instance().fetchJson("/system/branch").then(branchInfo => {
            this.setState({branchInfo, currentBranch:{
                    branch: branchInfo.current,
                    key: branchInfo.current,
                    isCurrent: true,
                    isDefault: branchInfo.current === branchInfo.default
                }})
        })
    };

    setCurrentBranch = (branch: string) => {
        API.instance().fetchJson("/system/branch/" + branch, {
            method: "PUT",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }).then(branchInfo => {
            this.setState({branchInfo})
        })
    };

    uploadFile = (file: any) => {
        let form = new FormData()
        form.append("file", file)
        this.setState({fileName: file.name.replace(/\\/g, '/').replace(/.*\//, '')})
        API.instance().fetchJson("/system/importdb", {method: 'POST', body: form}).then(json => {
            this.props.notification!(this.props.t("success"), JSON.stringify(json, undefined, 4), "success")
        })
    };

    uploadMD = (file: any) => {
        let form = new FormData()
        form.append("file", file)
        this.setState({mdFileName: file.name.replace(/\\/g, '/').replace(/.*\//, '')})
        API.instance().fetchJson("/masterdata/import", {method: 'POST', body: form}).then(json => {
            this.props.notification!(this.props.t("success"), JSON.stringify(json, undefined, 4), "success")
        })
    };

    deployFile = (file: any) => {
        let form = new FormData()
        form.append("file", file)
        this.setState({deployName: file.name.replace(/\\/g, '/').replace(/.*\//, '')});
        API.instance().fetchJson("/system/deploySupply", {method: 'POST', body: form}).then(json => {
            this.props.notification!(this.props.t("success"), JSON.stringify(json, undefined, 4), "success")
        })
    };

    downloadAll = () => {
        let filename = "export.zip";
        API.instance().download("/system/exportdb", {}, filename)
    };

    downloadSelected = () => {
        let filename = "export.zip";
        API.instance().download(`/system/exportdb?withReferences=${this.state.withReferences === true}&withDependents=${this.state.withDependents === true}&recursiveDependents=${this.state.recursiveDependents === true}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resources: this.state.resourceList.map(r => r.get('uri')),
                files: this.state.checkedFiles
            })
        }, filename)
    };

    downloadSQL = () => {
        let filename = "masterdata.json";
        API.instance().download(`/masterdata/export?sql=${this.state.sql}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }, filename)
    };

    handleAddNewResource = (resources: Ecore.Resource[]): void => {
        const {resourceList} = this.state
        resourceList.push(...resources)
        this.setState({drawerResourceVisible: false})
    };

    render() {
        const {t} = this.props as Props & WithTranslation;
        const branches = this.state.branchInfo.branches.map(branch => ({
            branch,
            key: branch,
            isCurrent: branch === this.state.branchInfo.current,
            isDefault: branch === this.state.branchInfo.default
        }));

        const branchRegion = <div className={"tools-branch-region tools-vertical-center-element"}>
            <div>
                <p className={"tools-header tools-padding-top tools-margin-left"}>
                    <NeoTypography type={"body_medium"}>{t("branch parameters")}</NeoTypography>
                </p>
                <p className={"tools-text tools-margin-left"} style={{marginBottom:'4px'}}><NeoTypography>{t("branch")}</NeoTypography></p>
                <NeoSelect
                    placeholder={t("choose from the list")}
                    className={"tools-select tools-margin-left"}
                    value={this.state.currentBranch.branch}
                    onChange={(currentValue: string)=>{
                        this.setState({currentBranch:branches.find(b=>b.key === currentValue)!})
                    }}>
                    {branches.map(b=>{
                        return <option key={b.key} >
                            {b.key}
                        </option>
                    })}
                </NeoSelect>
            </div>
            <div className={"tools-select-checkbox-area"}>
                <p className={"tools-text tools-branch-checkbox-text-margin"}>
                    <NeoTypography type={"capture_regular"}>{t("is default")}</NeoTypography>
                </p>
                <NeoInput
                    className={"tools-branch-checkbox"}
                    type={"checkbox"}
                    disabled={true}
                    checked={this.state.currentBranch.isDefault}
                />
            </div>
            <div className={"tools-select-checkbox-area"}>
                <p className={"tools-text tools-branch-checkbox-text-margin"}>
                    <NeoTypography type={"capture_regular"}>{t("is current")}</NeoTypography>
                </p>
                <NeoInput
                    className={"tools-branch-checkbox"}
                    type={"checkbox"}
                    disabled={this.state.currentBranch.isCurrent}
                    checked={this.state.currentBranch.isCurrent}
                    onChange={()=>{
                        if (!this.state.currentBranch.isCurrent && this.state.currentBranch.branch) {
                            const newBranchInfo = {
                                ...this.state.currentBranch,
                                isCurrent: true
                            };
                            this.setState({currentBranch:newBranchInfo}, ()=> this.setCurrentBranch(this.state.currentBranch.branch));
                        }
                    }}/>
            </div>
        </div>;

        const exportAllObjectsRegion = <div
            className={"tools-region-element tools-export-all-objects"}>
            <p className={"tools-header tools-margin-left tools-horizontal-center-element"}>
                <NeoTypography type={"body_medium"}>{t("export parameters")}</NeoTypography>
            </p>
            <NeoButton
                type={'link'}
                title={t("export all objects")}
                className={"tools-href tools-horizontal-center-element tools-margin-right"}
                onClick={() => {this.downloadAll()}}
            >
                <NeoTypography type={"body_link"} style={{color:'#B38136'}}>
                    {t("export all objects")}
                </NeoTypography>
            </NeoButton>
        </div>;

        const exportFilesRegion = <div
            className={"tools-region-element tools-horizontal-center-element tools-export-files"}>
            <div className={"tools-horizontal-center-element tools-icon-container tools-margin-left"}>
                <NeoButton
                    type={'link'}
                    className={"tools-highlighted-text"}
                    suffixIcon={<NeoIcon icon={"exportFile"} size={'m'}/>}
                    onClick={(event) => {
                        this.fileSystemLookupRef.current.showDrawer()
                    }}
                >
                    <NeoTypography style={{color: NeoColor.violete_5}} type={"capture_regular"}>{this.props.t("select export scripts")}</NeoTypography>
                </NeoButton>
            </div>
            <div className={"tools-horizontal-center-element"}>
                <FilesystemLookup ref={this.fileSystemLookupRef}
                                  notification={this.props.notification}
                                  checked={this.state.checkedFiles}
                                  onCheck={paths => this.setState({checkedFiles: paths})
                                  }/>
            </div>
        </div>;

        const exportObjectsRegion = <div
            className={"tools-export-objects-region"}>
            <p className={"tools-sub-header tools-margin-top tools-margin-left"} style={{marginBottom:'12px'}}>
                <NeoTypography type={"body_regular"}>{t("export metadata")}</NeoTypography>
            </p>
            <p className={"tools-text tools-margin-left"} style={{marginBottom:'13px'}}>
                <NeoTypography type={"capture_regular"}>{t("select metadata parameters")}</NeoTypography>
            </p>
            <NeoInput type={"checkbox"}
                      className={"tools-checkbox tools-margin-left"}
                      checked={this.state.withReferences}
                      onChange={(e:any) => this.setState({withReferences: e.target.checked})}>
                <NeoTypography type={"capture_regular"} style={{marginTop: '3px'}}>{t("with references")}</NeoTypography>
            </NeoInput>
            <NeoInput type={"checkbox"}
                      className={"tools-checkbox tools-margin-left"}
                      checked={this.state.withDependents}
                      onChange={(e:any) => this.setState({withDependents: e.target.checked})}>
                <NeoTypography type={"capture_regular"} style={{marginTop: '3px'}}>{t("with dependents")}</NeoTypography>
            </NeoInput>
            <NeoInput type={"checkbox"}
                      className={"tools-checkbox tools-margin-left"}
                      checked={this.state.recursiveDependents}
                      onChange={(e:any) => this.setState({recursiveDependents: e.target.checked})}>
                <NeoTypography type={"capture_regular"} style={{marginTop: '3px'}}>{t("recursive dependents")}</NeoTypography>
            </NeoInput>
            <div className={"tools-horizontal-center-element tools-export-files"}>
                <div className={"tools-horizontal-center-element tools-icon-container tools-margin-left"}>
                    <NeoButton
                        type={'link'}
                        className={"tools-highlighted-text"}
                        suffixIcon={<NeoIcon icon={"exportFile"} size={'m'}/>}
                        onClick={() => {
                            this.setState({drawerResourceVisible: true})
                        }}
                    >
                        <NeoTypography style={{color: NeoColor.violete_5}} type={"capture_regular"}>{t("select metadata for export")}</NeoTypography>
                    </NeoButton>
                </div>
                <div className={"tools-horizontal-center-element"}>
                    {this.state.resourceList.map(r =>
                        <NeoTag key={r.get("uri")} closable={true} onClose={() => {
                            const index = this.state.resourceList.indexOf(r);
                            this.state.resourceList.splice(index, 1)
                        }}>
                            {r.eContents()[0].get('name') || r.get('uri')}
                        </NeoTag>
                    )}
                </div>
                <div style={{marginTop: "15px"}}/>
                <NeoDrawer
                    title={this.props.t("select data")}
                    width={'50vw'}
                    visible={this.state.drawerResourceVisible}
                    mask={false}
                    onClose={()=>this.setState({drawerResourceVisible: false})}
                >
                    <SearchGrid key="search_grid_resource" onSelect={this.handleAddNewResource} showAction={false}
                                specialEClass={undefined}/>
                </NeoDrawer>
            </div>
        </div>;


        const exportButtonRegion = <div className={"tools-button-region"}>
            <NeoButton
                className={"tools-button tools-action-button tools-margin-left"}
                style={{width:'157px'}}
                type={this.state.resourceList.length === 0 && this.state.checkedFiles.length === 0 && !this.state.sql ? "disabled" : undefined}
                onClick={() => {
                    if (!(this.state.resourceList.length === 0 && this.state.checkedFiles.length === 0))
                        this.downloadSelected();
                    if (this.state.sql)
                        this.downloadSQL();
                    this.setState({resourceList:[], checkedFiles:[], sql: undefined})
                }}
            >{t('do export')}</NeoButton>
            <NeoButton
                className={"tools-button tools-clear-button tools-margin-left"}
                style={{width:'117px'}}
                type={"secondary"}
                onClick={()=>{
                    this.setState({resourceList:[], checkedFiles:[], sql: undefined})
                }}>
                {t('clear')}
            </NeoButton>
        </div>;

        const importButtonRegion = <div className={"tools-button-region"}>
            <NeoButton
                style={{width:'195px'}}
                className={"tools-button tools-action-button tools-margin-left"}
                type={this.state.filesUploadArray.length === 0 && this.state.MDUploadArray.length === 0 ? "disabled" : undefined}
                onClick={() => {
                    if (this.state.filesUploadArray.length !== 0) {
                        this.state.filesUploadArray.forEach(f=>this.uploadFile(f));
                    }
                    if (this.state.MDUploadArray.length !== 0) {
                        this.state.MDUploadArray.forEach(f=>this.uploadMD(f));
                    }
                    this.setState({MDUploadArray: [], filesUploadArray: []})
                }}
            >{t('import files')}</NeoButton>
            <NeoButton
                style={{width:'117px'}}
                className={"tools-button tools-clear-button tools-margin-left"}
                type={"secondary"}
                onClick={()=>{
                    this.setState({MDUploadArray: [], filesUploadArray: []})
                }}>
                {t('clear')}
            </NeoButton>
        </div>;

        const importParametersRegion = <div className={"tools-import-parameters tools-region-element"}>
            <p className={"tools-header tools-margin-left tools-horizontal-center-element"}>
                <NeoTypography type={"body_medium"}>{t("import parameters")}</NeoTypography>
            </p>
            <NeoButton
                type={'link'}
                title={t("import supply archive and copy it to server")}
                className={"tools-href tools-horizontal-center-element tools-margin-right"}
                onClick={() => {
                    this.deploySupplyInputRef.current!.click()
                }}
            >
                <NeoTypography type={"body_link"} style={{color:'#B38136'}}>
                    {t("deploy supply")}
                </NeoTypography>
            </NeoButton>
            <input ref={this.deploySupplyInputRef}
                   type="file" style={{display: "none"}}
                   onChange={e => {
                       const file = e!.target!.files![0]
                       if (file) {
                           this.deployFile(file)
                       }
                   }}
                   onClick={e => {
                       this.setState({deployName: undefined})
                   }}
            />
        </div>;

        const importFilesRegion = <div className={"tools-import-files tools-region-element"}>
            <div className={"tools-horizontal-center-element tools-icon-container tools-margin-left"}>
                <NeoButton
                    type={'link'}
                    className={"tools-highlighted-text"}
                    suffixIcon={<NeoIcon icon={"exportFile"} size={'m'}/>}
                    onClick={(event) => {
                        this.importObjectInputRef.current!.click()
                    }}
                >
                    <NeoTypography style={{color: NeoColor.violete_5}} type={"capture_regular"}>
                        {this.props.t("select files")}
                    </NeoTypography>
                </NeoButton>
                <input ref={this.importObjectInputRef}
                       type="file" style={{display: "none"}}
                       onChange={e => {
                           const file = e!.target!.files![0];
                           if (file) {
                               this.setState({filesUploadArray: this.state.filesUploadArray.concat([file])})
                               this.importObjectInputRef.current!.value = ""
                           }
                       }}
                       onClick={e => {
                           this.setState({fileName: undefined})
                       }}
                />
            </div>
            <div className={"tools-horizontal-center-element"}>
                {this.state.filesUploadArray.map(r =>
                    <NeoTag key={r.name} closable={true} onClose={() => {
                        const index = this.state.filesUploadArray.indexOf(r);
                        this.state.filesUploadArray.splice(index, 1);
                    }}>
                        {r.name}
                    </NeoTag>
                )}
            </div>
        </div>;

        const importMasterData = <div className={"tools-import-masterdata"}>
            <div className={"tools-horizontal-center-element tools-icon-container tools-margin-left"}>
                <NeoButton
                    type={'link'}
                    className={"tools-highlighted-text"}
                    suffixIcon={<NeoIcon icon={"exportFile"} size={'m'}/>}
                    onClick={(event) => {
                        this.importMDInputRef.current!.click()
                    }}
                >
                    <NeoTypography style={{color: NeoColor.violete_5}} type={"capture_regular"}>
                        {this.props.t("select masterdata")}
                    </NeoTypography>
                </NeoButton>
                <input ref={this.importMDInputRef}
                       type="file" style={{display: "none"}}
                       onChange={e => {
                           const file = e!.target!.files![0];
                           if (file) {
                               this.setState({MDUploadArray: this.state.MDUploadArray.concat([file])})
                               this.importMDInputRef.current!.value = ""
                           }
                       }}
                       onClick={e => {
                           this.setState({fileName: undefined})
                       }}
                />
            </div>
            <div className={"tools-horizontal-center-element"}>
                {this.state.MDUploadArray.map(r =>
                    <NeoTag key={r.name} closable={true} onClose={() => {
                        const index = this.state.MDUploadArray.indexOf(r);
                        this.state.MDUploadArray.splice(index, 1);
                    }}>
                        {r.name}
                    </NeoTag>
                )}
            </div>
        </div>;

        return (
            <div id={"tools"}>
                <Helmet>
                    <title>{this.props.t('tools')}</title>
                    <link rel="shortcut icon" type="image/png" href="/developer.ico" />
                </Helmet>
                {branchRegion}
                <NeoTabs className={"tools-tabs-region tools-vertical-center-element"}
                    defaultActiveKey={"export"}
                    tabPosition={'top'}>
                    <NeoTabs.NeoTabPane tab={t("export")} key={t("export")}>
                        <div
                            className={"tools-export-region tools-vertical-center-element"}>
                            {exportAllObjectsRegion}
                            {exportFilesRegion}
                            {exportObjectsRegion}
                        </div>
                        {exportButtonRegion}
                    </NeoTabs.NeoTabPane>
                    <NeoTabs.NeoTabPane tab={t("import")} key={t("import")} >
                        <div
                            className={"tools-import-region tools-vertical-center-element"}>
                            {importParametersRegion}
                            {importFilesRegion}
                            {importMasterData}
                        </div>
                        {importButtonRegion}
                    </NeoTabs.NeoTabPane>
                </NeoTabs>
            </div>
        );
    }
}

export default withTranslation()(Tools);
