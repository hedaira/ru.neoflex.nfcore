import React from "react";
import '../../../styles/Calendar.css';
import {withTranslation, WithTranslation} from "react-i18next";
import {EObject} from "ecore";
import {NeoButton, NeoCol, NeoInput, NeoInputNumber, NeoRow, NeoSelect, NeoSwitch} from "neo-design/lib";

interface Props {
    onEditNotification?: (notificationStatus: any[]) => void;
    periodicity: EObject[];
    spinnerVisible: boolean;
    editableNotification: Object;
    myNotificationVisible: boolean;
}

interface State {
    editableNotification: Object;
    periodicity: EObject[];
    spinnerVisible: boolean;
    myNotificationVisible: boolean;
}

class EditNotification extends React.Component<Props & WithTranslation & any, State> {

    state = {
        editableNotification: this.props.editableNotification,
        periodicity: this.props.periodicity,
        spinnerVisible: this.props.spinnerVisible,
        myNotificationVisible: this.props.myNotificationVisible
    };

    componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<State>, snapshot?: any): void {
        if (this.state.spinnerVisible !== this.props.spinnerVisible && this.state.spinnerVisible) {
            this.setState({spinnerVisible: false})
        }
        if (this.props.editableNotification.fullName !== prevProps.editableNotification.fullName) {
            this.setState({
                editableNotification: this.props.editableNotification,
                myNotificationVisible: this.props.myNotificationVisible
            })
        }
    }

    handleChange(e: any): void {
        const target = JSON.parse(e);
        let editableNotification: any = {
            'id': this.state.editableNotification['id'],
            'fullName': target['row'] === 'fullName' ? target['value'] : this.state.editableNotification['fullName'],
            'shortName': target['row'] === 'shortName' ? target['value'] : this.state.editableNotification['shortName'],
            'weekendReporting': target['row'] === 'weekendReporting' ? target['value'] : this.state.editableNotification['weekendReporting'],
            'periodicity': target['row'] === 'periodicity' ? target['value'] : this.state.editableNotification['periodicity'],
            'deadlineDay': target['row'] === 'deadlineDay' ? target['value'] : this.state.editableNotification['deadlineDay'],
            'deadlineTime': target['row'] === 'deadlineTime' ? target['value'] : this.state.editableNotification['deadlineTime'],
            };
        this.setState({editableNotification})
    }

    clear(): void {
        const editableNotification: any = {
            'id': this.state.editableNotification['id'],
            'fullName': undefined,
            'shortName': (this.state.myNotificationVisible ? undefined : this.state.editableNotification['shortName']),
            'weekendReporting': (this.state.myNotificationVisible ? false : this.state.editableNotification['weekendReporting']),
            'periodicity': (this.state.myNotificationVisible ? 'Month' : this.state.editableNotification['periodicity']),
            'deadlineDay': 1,
            'deadlineTime': (this.state.myNotificationVisible ? 9 : this.state.editableNotification['deadlineTime'])
        };
        this.setState({editableNotification})
    }

    save(editableNotification: any): void {
        this.setState({spinnerVisible: true});
        this.props.onEditNotification(editableNotification);
        this.props.handleEditMenu(editableNotification);
    }

    render() {
        const {t} = this.props;
        const {editableNotification} = this.state;
        return (
            <div id={'editNotificationButton'}>
                <NeoRow>
                    <NeoCol span={10} style={{alignItems:'initial'}}>
                        <span>{t('fullName')}</span>
                    </NeoCol>
                    <NeoCol span={12} style={{alignItems:'initial'}}>
                        <NeoInput
                            width={'200px'}
                            value={editableNotification['fullName']}
                            disabled={false}
                            allowClear={true}
                            onChange={(e: any) => {
                                const event = JSON.stringify({row: 'fullName', value: e.target.value === "" ? undefined : e.target.value});
                                this.handleChange(event)
                            }}
                        />
                    </NeoCol>
                </NeoRow>
                <NeoRow style={{marginTop: '10px'}}>
                <NeoCol span={10} style={{alignItems:'initial'}}>
                    <span>{t('shortName')}</span>
                </NeoCol>
                <NeoCol span={12} style={{alignItems:'initial'}}>
                    <NeoInput
                        width={'200px'}
                        value={editableNotification['shortName']}
                        disabled={!this.state.myNotificationVisible}
                        allowClear={true}
                        onChange={(e: any) => {
                            const event = JSON.stringify({row: 'shortName', value: e.target.value === "" ? undefined : e.target.value});
                            this.handleChange(event)
                        }}
                    />
                </NeoCol>
                </NeoRow>
                <NeoRow style={{marginTop: '10px'}}>
                    <NeoCol span={10} style={{alignItems:'initial'}}>
                        <span>{t('weekendReporting')}</span>
                    </NeoCol>
                    <NeoCol span={12} style={{alignItems:'initial'}}>
                        <NeoSwitch
                            checked={editableNotification['weekendReporting']}
                            disabled={!this.state.myNotificationVisible}
                            onChange={(e: any) => {
                                const event = JSON.stringify({row: 'weekendReporting', value: e})
                                this.handleChange(event)
                            }}
                        />
                    </NeoCol>
                </NeoRow>
                <NeoRow style={{marginTop: '10px'}}>

                    <NeoRow>
                        <NeoCol span={10} style={{alignItems:'initial'}}>
                            <span>{t('periodicity')}</span>
                        </NeoCol>
                        <NeoCol span={12} style={{alignItems:'initial'}}>
                            <NeoSelect
                                disabled={!this.state.myNotificationVisible}
                                value={t(editableNotification['periodicity'])}
                                width={'200px'}
                                allowClear={true}
                                onChange={(e: any) => {
                                    const event = e ? e : JSON.stringify({row: 'periodicity', value: undefined});
                                    this.handleChange(event)
                                }}
                            >
                                {
                                    this.state.periodicity!.map((p: any) =>
                                    <option
                                        key={JSON.stringify({row: 'periodicity', value: p})}
                                        value={JSON.stringify({row: 'periodicity', value: p})}
                                    >
                                        {t(p)}
                                    </option>
                                    )
                                }
                            </NeoSelect>
                        </NeoCol>
                    </NeoRow>

                    <NeoRow style={{marginTop: '10px'}}>
                        <NeoCol span={10} style={{alignItems:'initial'}}>
                            <span>{t('deadlineDay')}</span>
                        </NeoCol>
                        <NeoCol span={12} style={{alignItems:'initial'}}>
                            <NeoInputNumber
                                width={'200px'}
                                min={1}
                                max={220}
                                value={editableNotification['deadlineDay']}
                                disabled={false}
                                onChange={(e: any) => {
                                    const event = JSON.stringify({row: 'deadlineDay', value: e === "" ? undefined : e})
                                    this.handleChange(event)
                                }}
                            />
                        </NeoCol>
                    </NeoRow>

                    <NeoRow style={{marginTop: '10px'}}>
                        <NeoCol span={10} style={{alignItems:'initial'}}>
                            <span>{t('deadlineTime')}</span>
                        </NeoCol>
                        <NeoCol span={12} style={{alignItems:'initial'}}>
                            <NeoInputNumber
                                width={'200px'}
                                min={0}
                                max={23}
                                value={editableNotification['deadlineTime']}
                                formatter={value => `${value}:00`}
                                parser={value => value !== undefined ? value.replace(':00', '') : 1}
                                disabled={!this.state.myNotificationVisible}
                                onChange={(e: any) => {
                                    const event = JSON.stringify({row: 'deadlineTime', value: e === "" ? undefined : e});
                                    this.handleChange(event)
                                }}
                            >
                            </NeoInputNumber>
                        </NeoCol>
                    </NeoRow>
                </NeoRow>


                <NeoRow style={{marginTop: '15px'}}>
                    <NeoCol span={10} style={{alignItems:'initial'}}>
                    </NeoCol>
                    <NeoCol span={13} style={{alignItems:'initial'}}>

                        {
                            this.state.spinnerVisible &&
                            <div className="small_loader">
                                <div className="small_inner one"/>
                                <div className="small_inner two"/>
                                <div className="small_inner three"/>
                            </div>
                        }

                    </NeoCol>

                </NeoRow>
                <div style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '80px',
                    width: '100%',
                    borderTop: '1px solid #e9e9e9',
                    padding: '16px 40px',
                    background: '#F2F2F2',
                    textAlign: 'left',
                }}>
                        <NeoButton
                            title={t('save')}
                            style={{ width: '100px', right: '6px', }}
                            onClick={()=> this.save(this.state.editableNotification)}
                        >
                            {t('save')}
                        </NeoButton>

                        <NeoButton
                            type={'secondary'}
                            title={t('clear')}
                            style={{ marginLeft: '10px', width: '100px', right: '6px', }}
                            onClick={()=> this.clear()}
                        >
                            {t('clear')}
                        </NeoButton>
                </div>
            </div>
        )
    }
}

export default withTranslation()(EditNotification)
