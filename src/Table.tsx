import React from 'react';

type TableProps<T> = {
    Columns: Array<ColumnDefinition<T>>;
    Data: T[];
}

export class Table<T> extends React.Component<TableProps<T>, TableState<T>> {
    render() {
        const props = this.props;
        function mapData(row: T) {
            return <tr>{props.Columns.map(c => <td>{c.Content(row)}</td>)}</tr>;
        }
        return <table>
            <thead>
                <tr>
                    {props.Columns.map(c => c.Name).map(c => <td>{c}</td>)}
                </tr>
            </thead>
            <tbody>
                {props.Data.map(mapData)}
            </tbody>
        </table>;
    }
}



export interface TableState<T> {

}

type selectorResult = JSX.Element | string | number;

export interface ColumnDefinition<T> {
    Name: string,
    Content: (rowItem: T) => selectorResult
}

export class TableData<T> {
    Columns: Array<ColumnDefinition<T>>

    constructor(public Data: T[]) {
        this.Columns = [];
    }

    AddColumn(name: string, content: (rowItem: T) => selectorResult) {
        this.Columns.push({ Name: name, Content: content });
        return this;
    }
}