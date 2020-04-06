import * as React from 'react';
import {WithTranslation, withTranslation} from 'react-i18next';
import {EObject} from 'ecore';
import {Button, Row, Col, Form, Select, Input, List} from 'antd';
import {FormComponentProps} from "antd/lib/form";
import {faPlay, faPlus, faRedo, faTrash} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {paramType} from "./DatasetView"
import {IServerQueryParam} from "../../../MainContext";
import {DrawerParameterComponent} from './DrawerParameterComponent';
import {MouseEvent} from "react";

const inputOperationKey: string = "_inputOperationKey";
const inputFieldKey: string = "_inputFieldKey";
const inputSelectKey: string = "_inputSelectKey";

interface Props {
    parametersArray?: Array<IServerQueryParam>;
    columnDefs?:  Array<any>;
    onChangeParameters?: (newServerParam: any[], paramName: paramType) => void;
    saveChanges?: (newServerParam: any[], paramName: paramType) => void;
    isVisible?: boolean;
    allCalculatorOperations?: Array<EObject>;
    componentType?: paramType;
    onChangeColumnDefs?: (columnDefs: any, rowData: any, datasetComponentName: string) => void;
    defaultColumnDefs?: Array<any>;
}

interface State {
    parametersArray: IServerQueryParam[] | undefined;
    expression: string;
    currentIndex: number;
}

interface CalculatorEventHandlerProps {
    onItemsClick: React.MouseEventHandler<HTMLElement>;
    onClearClick: React.MouseEventHandler<HTMLElement>;
}

function CreateCalculator({onItemsClick, onClearClick}:CalculatorEventHandlerProps) {
    return <Col>
                <Row>
                    <Button onClick={onItemsClick}>1</Button>
                    <Button onClick={onItemsClick}>2</Button>
                    <Button onClick={onItemsClick}>3</Button>
                    <Button onClick={onItemsClick}>+</Button>
                </Row>
                <Row>
                    <Button onClick={onItemsClick}>4</Button>
                    <Button onClick={onItemsClick}>5</Button>
                    <Button onClick={onItemsClick}>6</Button>
                    <Button onClick={onItemsClick}>-</Button>
                </Row>
                <Row>
                    <Button onClick={onItemsClick}>7</Button>
                    <Button onClick={onItemsClick}>8</Button>
                    <Button onClick={onItemsClick}>9</Button>
                    <Button onClick={onItemsClick}>/</Button>
                </Row>
                <Row>
                    <Button onClick={onClearClick}>c</Button>
                    <Button onClick={onItemsClick}>0</Button>
                    <Button onClick={onItemsClick}>.</Button>
                    <Button onClick={onItemsClick}>*</Button>
                </Row>
            </Col>
}

interface ColumnButtonsProps {
    columnDefs: any[],
    onClick: React.MouseEventHandler<HTMLElement>
}

function CreateColumnButtons({columnDefs, onClick}: ColumnButtonsProps) {
    return <List>
                {columnDefs?.map((element, index) =>{
                    return <Row>
                        <Button key={element.get("field")} onClick={onClick}>{element.get("field")}</Button>
                    </Row>
                })}
            </List>
}

class Calculator extends DrawerParameterComponent<Props, State> {
    currentField: string;
    
    constructor(props: any) {
        super(props);
        this.state = {
            parametersArray: this.props.parametersArray,
            //array index
            currentIndex: 0
        };
    }

    componentDidUpdate(prevProps: any, prevState: any, snapshot?: any): void {
        if (JSON.stringify(prevState.currentIndex) !== JSON.stringify(this.state.currentIndex)
            || JSON.stringify(prevState.parametersArray) !== JSON.stringify(this.state.parametersArray)) {
            this.setFieldsValue({
                [inputOperationKey]: this.state.parametersArray![this.state.currentIndex!].operation!,
                [inputFieldKey]: this.state.parametersArray![this.state.currentIndex!].datasetColumn!
            });
        }
    }

    handleCalculate = (e: MouseEvent<HTMLElement>) => {
        this.setFieldsValue({
            [inputOperationKey]: this.getFieldValue(inputOperationKey) + e.currentTarget.textContent
        })
    };

    handleClear = (e: MouseEvent<HTMLElement>) => {
        this.setFieldsValue({
            [inputOperationKey]:""
        })
    };

    createNewRow = () => {
        if (this.getFieldValue(inputFieldKey)
            && this.getFieldValue(inputFieldKey) !== "") {
            let parametersArray: any = this.state.parametersArray;
            parametersArray.push(
                {index: parametersArray.length + 1,
                    datasetColumn: undefined,
                    operation: undefined,
                    enable: true,
                    type: undefined});
            let currentIndex = parametersArray.length - 1;
            this.setState({parametersArray, currentIndex});
        } else {
            this.props.context.notification('Achtung!','Empty field name', 'error')
        }
    };

    deleteRow = () => {
        //Удаляем смещаем на 1 вниз
        if (this.state.parametersArray?.length !== 1) {
            let parametersArray = this.state.parametersArray?.filter((element => {
                return element.index - 1 !== this.state.currentIndex
            })).map((element, index) => {
                return {...element,
                        index: index + 1}
            });
            let currentIndex = parametersArray!.length - 1;
            this.deleteColumnDef(this.state.parametersArray![this.state.currentIndex!].datasetColumn!);
            this.setState({parametersArray, currentIndex});
        //Последний обнуляем
        } else {
            this.deleteColumnDef(this.state.parametersArray![this.state.currentIndex!].datasetColumn!);
            let parametersArray = this.state.parametersArray?.map((element) => {
                   return {index: 1,
                       datasetColumn: undefined,
                       operation: undefined,
                       enable: true,
                       type: undefined}
                }
            );
            this.setState({parametersArray});
        }
    };

    addAllColumnDef = (parametersArray: IServerQueryParam[]) => {
        let columnDefs = this.props.defaultColumnDefs.map((e:any)=> e);
        parametersArray.forEach(element => {
            if (element.enable && element.datasetColumn) {
                let rowData = new Map();
                rowData.set('field', element.datasetColumn);
                rowData.set('headerName', element.datasetColumn);
                //TODO определение типа по выражению?
                rowData.set('headerTooltip', "type : String");
                rowData.set('hide', false);
                rowData.set('pinned', false);
                rowData.set('filter', true);
                rowData.set('sort', true);
                rowData.set('editable', false);
                rowData.set('checkboxSelection', false);
                rowData.set('sortable', true);
                rowData.set('suppressMenu', false);
                rowData.set('resizable', false);
                rowData.set('type', "String");
                if (!columnDefs.some((col: any) => {
                    return col.get('field')?.toLocaleLowerCase() === element.datasetColumn?.toLocaleLowerCase()
                })) {
                    columnDefs.push(rowData);
                }
            }
        });
        this.props.onChangeColumnDefs(columnDefs);
    };
    
    deleteColumnDef = (columnName: string) => {
        if (columnName) {
            let columnDefs = this.props.columnDefs.filter((element: any) => {
                return element.get('field').toLocaleLowerCase() !== columnName.toLocaleLowerCase()
            });
            if (JSON.stringify(columnDefs) !== JSON.stringify(this.props.columnDefs)) {
                this.props.onChangeColumnDefs(columnDefs)
            }
        }
    };

    handleSubmit = (e: any) => {
        e.preventDefault();
        this.props.form.validateFields((err: any, values: any) => {
            if (err) {
                this.props.context.notification('Achtung!','Please, correct the mistakes', 'error')
            } else {
                let parametersArray: any = this.state.parametersArray!.map((element)=>{
                    if (element.index-1 === this.state.currentIndex) {
                        return {
                            index: element.index,
                            datasetColumn: this.getFieldValue(inputFieldKey),
                            operation: this.getFieldValue(inputOperationKey),
                            enable: true,
                            type: undefined
                        }
                    } else {
                        return element
                    }
                });
                this.addAllColumnDef(parametersArray);
                this.setState({parametersArray});
                this.props.onChangeParameters!(parametersArray!, this.props.componentType)
            }
        });
    };

    render() {
    return (
            <Form style={{ marginTop: '30px' }} onSubmit={this.handleSubmit}>
                <Form.Item style={{marginTop: '-38px', marginBottom: '40px'}}>
                    <Col span={8}>
                        <div style={{display: "inherit", fontSize: '17px', fontWeight: 500, marginLeft: '18px', color: '#878787'}}>Вычисляемые столбцы</div>
                        {
                            this.getFieldDecorator(inputFieldKey,{
                                rules: [{
                                    required:true,
                                    message: ' '
                                }]
                            })(
                                <Input/>
                            )
                        }
                    </Col>
                    <Col span={16} style={{textAlign: "right"}}>
                        {
                            this.getFieldDecorator(inputSelectKey,{
                                initialValue: this.getFieldValue(inputFieldKey)
                            })(
                                <Select
                                    onChange={(e: any) => {
                                        this.setState({currentIndex:e});
                                    }}>
                                    {this.state.parametersArray?.map((element)=> {
                                        return <Select.Option
                                            key={(element.datasetColumn)? element.datasetColumn : ""}
                                            value={(element.index)? element.index - 1 : 0}
                                        >
                                            {element.datasetColumn}
                                        </Select.Option>
                                    })}

                                </Select>
                            )
                        }
                        <Button
                            title="add row"
                            style={{width: '40px', marginRight: '10px'}}
                            key={'createNewRowButton'}
                            value={'createNewRowButton'}
                            onClick={this.createNewRow}
                        >
                            <FontAwesomeIcon icon={faPlus} size='xs' color="#7b7979"/>
                        </Button>
                        <Button
                            title="run query"
                            style={{width: '40px'}}
                            key={'runQueryButton'}
                            value={'runQueryButton'}
                            htmlType="submit"
                        >
                            <FontAwesomeIcon icon={faPlay} size='xs' color="#7b7979"/>
                        </Button>
                        <Button
                            title="delete"
                            style={{width: '40px', marginRight: '10px'}}
                            key={'deleteButton'}
                            value={'deleteButton'}
                            onClick={this.deleteRow}
                        >
                            <FontAwesomeIcon icon={faTrash} size='xs' color="#7b7979"/>
                        </Button>
                    </Col>
                </Form.Item>
                <Form.Item>
                    <Row>
                        <Col span={12}>
                            {
                                this.getFieldDecorator(inputOperationKey,{
                                    /*value: this.currentOperation,*/
                                    initialValue: "",
                                    rules: [{
                                        required:true,
                                        message: ' '
                                    }]
                                })(
                                    <Input/>
                                  )
                            }
                            <CreateColumnButtons onClick={this.handleCalculate} columnDefs={this.props.columnDefs}/>
                        </Col>
                        <Col span={12}>
                            <CreateCalculator onItemsClick={this.handleCalculate} onClearClick={this.handleClear}/>
                        </Col>
                    </Row>
                </Form.Item>
            </Form>
        )
    }
}

export default withTranslation()(Form.create<Props & FormComponentProps & WithTranslation>()(Calculator))
