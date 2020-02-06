import React from 'react';
import * as dateFns from "date-fns";
import Ecore from "ecore";
import {API} from "../../modules/api";
import {ru, enUS} from "date-fns/locale";
import {zhCN} from "date-fns/esm/locale";
import {WithTranslation, withTranslation} from "react-i18next";
import {MainContext} from "../../MainContext";
import {Button} from "antd";


interface State {
    currentMonth: Date;
    selectedDate: Date;
    ReportStatus: Ecore.EObject[];
    InstanceReports: Ecore.EObject[];
    calendarLanguage: string;
}

interface Props {
    reporting: number
}

class Calendar extends React.Component<Props & WithTranslation, State> {

    state = {
        currentMonth: new Date(),
        selectedDate: new Date(),
        ReportStatus: [],
        InstanceReports: [],
        calendarLanguage: ""
    };

    getAllInstanceReports() {
        API.instance().fetchAllClasses(false).then(classes => {
            const temp = classes.find((c: Ecore.EObject) => c._id === "//InstanceReport");
            if (temp !== undefined) {
                API.instance().findByKind(temp, {contents: {eClass: temp.eURI()}}, 999)
                    .then((resources) => {
                        this.setState({InstanceReports: resources})
                    })
            }
        })
    };

    getAllStatuses() {
        API.instance().fetchAllClasses(false).then(classes => {
            const temp = classes.find((c: Ecore.EObject) => c._id === "//ReportStatus");
            if (temp !== undefined) {
                API.instance().findByClass(temp, {contents: {eClass: temp.eURI()}})
                    .then((statuses) => {
                        this.setState({ReportStatus: statuses})
                    })
            }
        })
    };

    private getLocale(i18n: any) {
        return i18n.language === "cn" ? zhCN
            :
            i18n.language === "ru" ? ru
                : enUS;
    }

    renderHeader() {
        const {i18n} = this.props;
        const dateFormat = "LLLL yyyy";
        return (
            <div className="header row flex-middle">
                <div className="col col-start">
                    <div className="icon" onClick={this.prevMonth}>
                        chevron_left
                    </div>
                </div>
                <div className="col col-center">
        <span className="col-text" style={{fontSize: "120%"}}>
            {dateFns.format(this.state.currentMonth, dateFormat, {locale: this.getLocale(i18n)})}
        </span>
                </div>
                <div className="col col-end" onClick={this.nextMonth}>
                    <div className="icon">chevron_right</div>
                </div>
            </div>
        );
    }

    renderDays() {
        const {i18n} = this.props;
        const dateFormat = "EEEE";
        const days = [];
        let startDate = dateFns.startOfWeek(this.state.currentMonth, {locale: ru});
        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i}
                     className="col col-center col-text" style={{fontSize: "110%"}}
                >
                    {dateFns.format(dateFns.addDays(startDate, i), dateFormat, {locale: this.getLocale(i18n)})}
                </div>
            );
        }
        return <div className="days row">{days}</div>;
    }

    openReport(report: any, context: any): void  {
        let params: Object[] = [{
            datasetColumn: 'reportDate',
            operation: 'EqualTo',
            value: report.eContents()[0].get('date'),
            enable: true,
            type: 'Date'
        }];
        context.changeURL(
            report.eContents()[0].get('report').get('AppModule').get('name'),
            undefined,
            params
        )
    }

    renderCells(context: any) {
        const { currentMonth, selectedDate } = this.state;
        const monthStart = dateFns.startOfMonth(currentMonth);
        const monthEnd = dateFns.endOfMonth(monthStart);
        const startDate = dateFns.startOfWeek(monthStart, {locale: ru});
        const endDate = dateFns.endOfWeek(monthEnd, {locale: ru});

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";
        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                let content = this.getContents(day);
                formattedDate = dateFns.format(day, dateFormat);
                const cloneDay = day;
                days.push(
                    <div
                        className={`col cell ${
                            !dateFns.isSameMonth(day, monthStart)
                                ? "disabled"
                                : dateFns.isSameDay(day, selectedDate) ? "selected" : ""
                            }`}
                        key = {day.toString()}
                        onClick={() =>
                            this.onDateClick(cloneDay)
                        }
                    >
                        <span className="number">{formattedDate}</span>
                        <span className="bg">{formattedDate}</span>
                        <div>
                            {content.length !== 0
                                ?
                                content.map( (r: any) =>
                                    <Button
                                        onClick={ () => this.openReport(r, context)}
                                        key={`${r.get('uri')}/${r.rev}`}
                                        size="small"
                                        style={{width: "150px", display: "flex", color: "black", backgroundColor: r.eContents()[0].get('status') ? r.eContents()[0].get('status').get('color') : "white"}}
                                        title={`${r.eContents()[0].get('report').get('name')}\n${dateFns.format(dateFns.parseISO(r.eContents()[0].get('date')), "PPpp ",{locale: ru})}\n
[за ${dateFns.format(dateFns.lastDayOfMonth(dateFns.addMonths(this.state.currentMonth, -1)), "P", {locale: ru})}]`}
                                    >
                                        {r.eContents()[0].get('report').get('name')}
                                    </Button>
                                )
                                : ""}
                        </div>
                    </div>
                );
                day = dateFns.addDays(day, 1);
            }
            rows.push(
                <div className="row" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return (
            <div>
                <div className="body">{rows}</div>
            </div>
        )
    }

    private getContents(day: any) {
        let temp: any = [];
        if (this.props.reporting === 1) {
            this.state.InstanceReports.filter((r: any) =>
                dateFns.isSameYear(day, dateFns.parseISO(r.eContents()[0].get('date')))
                && dateFns.isSameMonth(day, dateFns.parseISO(r.eContents()[0].get('date')))
                && dateFns.isSameDay(day, dateFns.parseISO(r.eContents()[0].get('date')))
            ).map((r) => temp.push(r))
            return temp;
        } else if (this.props.reporting === 2) {
            //Тут написать, что будет в налоговой отчетности вместо отчетов
            return []
        }
    }
    
    onDateClick = (day: any) => {
        this.setState({
            selectedDate: day
        })
    };

    nextMonth = () => {
        this.setState({
            currentMonth: dateFns.addMonths(this.state.currentMonth, 1)
        })
    };

    prevMonth = () => {
        this.setState({
            currentMonth: dateFns.subMonths(this.state.currentMonth, 1)
        })
    };

    componentDidMount(): void {
        this.getAllStatuses();
        this.getAllInstanceReports();
    }

    render() {
        return (
            <MainContext.Consumer>
                { context => (
                    <div className="calendar">
                        {this.renderHeader()}
                        {this.renderDays()}
                        {this.renderCells(context)}
                    </div>
                )}
            </MainContext.Consumer>
        );
    }
}

export default withTranslation()(Calendar)
