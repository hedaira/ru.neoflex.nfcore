import * as React from 'react';
import {WithTranslation, withTranslation} from "react-i18next";
import {API} from "../../../modules/api";
import AceEditor from "react-ace";
import 'brace/mode/json';
import 'brace/mode/css';
import 'brace/mode/scss';
import 'brace/mode/jsx';
import 'brace/mode/html';
import 'brace/mode/tsx';
import 'brace/mode/text';
import 'brace/mode/markdown';
import 'brace/theme/tomorrow';
import {NeoButton, NeoParagraph} from "neo-design/lib";
import '../../../styles/FilesystemEditor.css'
import {copyToClipboard} from "../../../utils/clipboard";
import {IMainContext} from "../../../MainContext";

interface Props {
    path: string,
    notification: IMainContext['notification']
}

const extModeMap = new Map<string, string>([
    ["json", "json"],
    ["css", "css"],
    ["scss", "scss"],
    ["sass", "scss"],
    ["js", "jsx"],
    ["jsx", "jsx"],
    ["ts", "tsx"],
    ["tsx", "tsx"],
    ["md", "markdown"],
])
const getMode = (path: string): string => {
    const ext = path.split('.').pop() || ""
    return extModeMap.get(ext) || "text"
}

class FilesystemTextEditor extends React.Component<Props & WithTranslation, any> {
    state = {
        path: "",
        text: "",
        mode: "text",
        isEdited: false,
        //skip first close animation
        isFirstEdit: false,
    }

    componentDidMount() {
        this.setState({path: this.props.path}, this.props.path !== "/" ? this.loadContents : undefined)
    }

    componentDidUpdate(prevProps: Readonly<Props & WithTranslation>, prevState: Readonly<any>, snapshot?: any) {
        if (this.state.path !== this.props.path) {
             this.setState({path: this.props.path, isEdited: false, isFirstEdit: false}, this.props.path !== "/" ? this.loadContents : undefined)
        }
    }

    loadContents = () => {
        if (this.state.path) {
            API.instance().fetch("/system/fs/data?path=" + this.state.path)
                .then(response => response.text())
                .then(text => this.setState({text, mode: getMode(this.state.path)}))
        }
    }

    save = () => {
        API.instance().fetchJson("/system/fs?path=" + this.state.path, {
            method: 'PUT',
            body: this.state.text
        }).then(value => {
            this.setState({isEdited: false});
        })
    }

    onTextChange = (text: string) => {
        if (this.state.text !== text) {
            this.setState({text, isEdited: true, isFirstEdit: true})
        }
    };

    render() {
        const {t} = this.props
        return (
            <div style={{display: 'flex', flexFlow: 'column', height: '100%'}}>
                <div className={"filesystem-text-editor-bar"}>
                    {this.state.path !== "/" &&
                    <>
                        <div style={{
                            display: 'inline-block',
                            height: '40px',
                            margin: "0 16px 0 0",
                            borderLeft: '1px solid #B3B3B3',
                            width: '1px'
                        }}/>
                        <NeoButton
                            className={"filesystem-text-editor-button"}
                            title={t('refresh')}
                            type={"link"}
                            onClick={this.loadContents}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.9917 5.12252C13.3293 4.39936 11.4611 4.30284 9.733 4.85083C8.00487 5.39883 6.53373 6.55424 5.59179 8.10326C4.64985 9.65229 4.30088 11.4901 4.60946 13.2766C4.91803 15.063 5.86326 16.6773 7.27024 17.8206C8.67722 18.9639 10.4507 19.5589 12.2625 19.4954C14.0743 19.432 15.8019 18.7144 17.1254 17.4754C18.449 16.2365 19.2789 14.5601 19.4618 12.7564C19.5036 12.3443 19.8715 12.0441 20.2836 12.0859C20.6957 12.1276 20.9959 12.4956 20.9541 12.9077C20.7347 15.0721 19.7387 17.0838 18.1505 18.5705C16.5622 20.0572 14.4892 20.9183 12.315 20.9945C10.1408 21.0706 8.01265 20.3567 6.32428 18.9847C4.63591 17.6127 3.50164 15.6756 3.13135 13.5319C2.76106 11.3881 3.17982 9.18275 4.31014 7.32392C5.44047 5.46508 7.20584 4.07859 9.2796 3.421C11.3534 2.76341 13.5951 2.87923 15.5901 3.74703C17.1905 4.44323 18.5452 5.58561 19.5 7.02503V4.5C19.5 4.08579 19.8358 3.75 20.25 3.75C20.6642 3.75 21 4.08579 21 4.5V9C21 9.41422 20.6642 9.75 20.25 9.75H15.75C15.3358 9.75 15 9.41422 15 9C15 8.58579 15.3358 8.25 15.75 8.25H18.4952C17.695 6.86394 16.469 5.76514 14.9917 5.12252Z" fill="#5E6785"/>
                            </svg>
                        </NeoButton>
                        <div style={{
                            display: 'inline-block',
                            height: '40px',
                            padding: "0 16px 0 0",
                            borderLeft: '1px solid #B3B3B3',
                            width: '1px'
                        }}/>
                        <NeoButton
                            className={"filesystem-text-editor-button"}
                            title={t('generate link')}
                            type={"link"}
                            onClick={()=>{
                                copyToClipboard(this.state.path).then(()=>{
                                    this.props.notification!(this.props.t('path generated'), t('path generated into buffer') + ` "${this.state.path}"`, "success");
                                })
                            }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.5 3C13.0858 3 12.75 3.33579 12.75 3.75C12.75 4.16421 13.0858 4.5 13.5 4.5H18.4393L10.7197 12.2197C10.4268 12.5126 10.4268 12.9874 10.7197 13.2803C11.0126 13.5732 11.4874 13.5732 11.7803 13.2803L19.5 5.56066V10.5C19.5 10.9142 19.8358 11.25 20.25 11.25C20.6642 11.25 21 10.9142 21 10.5V3.75C21 3.33579 20.6642 3 20.25 3H13.5Z" fill="#5E6785"/>
                                <path d="M10.5 4.5C10.9142 4.5 11.25 4.83579 11.25 5.25C11.25 5.66421 10.9142 6 10.5 6H6.75C5.92157 6 5.25 6.67157 5.25 7.5V17.25C5.25 18.0784 5.92157 18.75 6.75 18.75H16.5C17.3284 18.75 18 18.0784 18 17.25V13.5C18 13.0858 18.3358 12.75 18.75 12.75C19.1642 12.75 19.5 13.0858 19.5 13.5V17.25C19.5 18.9069 18.1569 20.25 16.5 20.25H6.75C5.09315 20.25 3.75 18.9069 3.75 17.25V7.5C3.75 5.84315 5.09315 4.5 6.75 4.5H10.5Z" fill="#5E6785"/>
                            </svg>
                            <NeoParagraph type={"body_regular"}>{t('generate link')}</NeoParagraph>
                        </NeoButton>
                    </>
                    }
                </div>
                <div style={{
                    height: '100%',
                    width: '100%',
                    overflow: 'auto',
                    borderRight: '1px solid #E6E6E6',
                    borderBottom: this.props.path === "/" || !this.state.isEdited ? '1px solid #E6E6E6' : 'none',
                    borderRadius: this.props.path === "/" || !this.state.isEdited ? '0 0 4px 0' : 'unset'
                }}>
                    {this.state.path !== "/" && <AceEditor
                        ref={"aceEditor"}
                        mode={this.state.mode}
                        width={""}
                        onChange={this.onTextChange}
                        editorProps={{$blockScrolling: true}}
                        value={this.state.text}
                        showPrintMargin={false}
                        theme={"tomorrow"}
                        debounceChangePeriod={0}
                        height={"100%"}
                        minLines={5}
                        enableBasicAutocompletion={true}
                        commands={[
                            {
                                name: "Save",
                                bindKey: {mac: "Cmd-S", win: "Ctrl-S"},
                                exec: this.save
                            },
                        ]}
                    />}
                </div>
                {this.state.path !== "/" && this.state.isFirstEdit && <div className={`filesystem-text-editor-bar secondary-bar ${!this.state.isEdited ? "close" : "open"}`}>
                    <NeoButton
                        onClick={this.save}>
                        {t('save')}
                    </NeoButton>
                    <NeoButton
                        type={"secondary"}
                        onClick={()=>{
                            this.loadContents();
                            this.setState({isEdited: false})
                        }}>
                        {t('cancel')}
                    </NeoButton>
                </div>}
            </div>
        );
    }
}

export default withTranslation()(FilesystemTextEditor)
