import * as React from "react";
import Ecore from "ecore"
import {actionType, eventType} from "./utils/consts";

export const MainContext: React.Context<IMainContext> = React.createContext<IMainContext>({});

export interface IServerQueryParam {
    index: number,
    datasetColumn?: string,
    operation?: string,
    value?: string,
    enable?: boolean,
    type?: string
    highlightType?: string,
    backgroundColor?: string,
    color?: string
}

export interface IServerNamedParam {
    parameterName: string,
    parameterValue: string,
    parameterDataType?: string,
    parameterDateFormat?: string
}

export interface IEvent {
    type: eventType,
    itemName: string
}

export interface IEventAction {
    name: string,
    actions: {
        actionType: actionType,
        callback: () => void
    }[]
}

export interface IEventHandler {
    name: string,
    eventType: eventType,
    callback: () => void
}

export interface IMainContext {
    updateContext?: (context: any, cb?: () => void) => void;
    applicationReferenceTree?: Ecore.EObject
    viewReferenceTree?: Ecore.EObject
    viewObject?: Ecore.EObject
    changeURL?: (appModuleName?: string, useParentReferenceTree?: boolean, treeValue?: undefined, params?: Object[] | undefined) => void;
    runQuery?: (resource: Ecore.Resource, queryParams: IServerNamedParam[], filterParams: IServerQueryParam[], aggregationParams: IServerQueryParam[], sortsParams: IServerQueryParam[], groupByParams: IServerQueryParam[], calculatedExpression: IServerQueryParam[], ) => Promise<string>;
    datasetComponents?: any;
    notification?: (title: string, description: string, notificationType: "success" | "error" | "info" | "warning" | "open") => void;
    userProfile?: Ecore.EObject;
    changeUserProfile?: (viewObjectId: string, userProfileParams: any) => void;
    addDocxHandler?: (handler:any)=>void;
    addExcelHandler?: (handler:any)=>void;
    addEventAction?: (action:IEventAction)=>void;
    removeDocxHandler?: ()=>void;
    removeExcelHandler?: ()=>void;
    removeEventAction?: ()=>void;
    getDocxHandlers?: ()=>any[];
    getExcelHandlers?: ()=>any[];
    getEventActions?: ()=>IEventAction[];
    contextItemValues?: Map<String, any>;
    addEventHandler?: (eventHandler: IEventHandler)=>void;
    removeEventHandler?: (name: string)=>void;
    notifyAllEventHandlers?: (event: IEvent)=>void;
}
