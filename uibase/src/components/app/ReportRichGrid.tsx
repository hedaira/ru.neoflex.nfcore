import * as React from "react";
import {withTranslation, WithTranslation} from "react-i18next";


interface Props {
}

interface State {
}

class ReportRichGrid extends React.Component<Props & WithTranslation, State> {

    state = {
    };

    componentDidMount(): void {
    }

    render() {
        return (
            <div>
                This is Rich Grid (Test)
            </div>
        )
    }
}

const ReportRichGridTrans = withTranslation()(ReportRichGrid);
export default ReportRichGridTrans;