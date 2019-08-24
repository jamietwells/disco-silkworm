import React from 'react';

export interface IStatusHandler {
    setMessage: (message: string) => void;
    clear: () => void;
}

interface State {
    loading: boolean,
    message?: string
}

interface Props {
    assignHandler: (handler: IStatusHandler) => void
}

export class StatusIndicator extends React.Component<Props, State> implements IStatusHandler {
    public setMessage(message: string) {
        this.updateState({ loading: true, message: message });
    }

    public clear() {
        this.updateState({ loading: false, message: undefined });
    }

    private updateState(state: State) {
        this.setState(state);
    }

    componentDidMount() {
        this.props.assignHandler(this);
    }

    render() {
        if (!(this.state && this.state.loading && this.updateState))
            return <></>;
        return (
            <div>
                <p>{this.state.message}</p>
            </div>
        );
    }
}