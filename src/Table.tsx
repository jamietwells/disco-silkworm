import React from 'react';

type TableProps<T> = {
    Columns: Array<ColumnDefinition<T>>;
    Data: T[];
}

export class Table<T> extends React.Component<TableProps<T>, TableState<T>> {
    constructor(props: TableProps<T>){
        super(props);
        this.state = { SortFunction: () => 1 }
    }

    render() {
        type SortableColumnDefinition<T> = ColumnDefinition<T> & {
            Direction?: 'ASC' | 'DESC'
        }

        const props = this.props;

        const columns = props.Columns.map(c => c as SortableColumnDefinition<T>);
        const instance = this;

        function getSortButton(column: SortableColumnDefinition<T>){
            if(!column.SortFunction)
                return <></>;
            const fn = column.SortFunction;
            const direction = column.Direction;

            function onClick(){
                columns.forEach(c => c.Direction = undefined);
                column.Direction = direction === 'DESC' ? 'ASC' : 'DESC';
                instance.setState(old => ({... old, SortFunction: column.Direction === 'ASC' ? fn : (a,b) => fn(b,a) }));
            }
            return <button onClick={onClick}>{column.Direction ? column.Direction === 'ASC' ? '↓' : '↑' : '-'}</button> 
        }

        function mapData(row: T) {
            return <tr>{columns.map(c => <td>{c.Content(row)}</td>)}</tr>;
        }
        return <table>
            <thead>
                <tr>
                    {columns.map(c => <td>{c.Name}{getSortButton(c)}</td>)}
                </tr>
            </thead>
            <tbody>
                {props.Data.sort(instance.state.SortFunction).map(mapData)}
            </tbody>
        </table>;
    }
}

export interface TableState<T> {
    SortFunction: (a: T, b: T) => number 
}

type selectorResult = JSX.Element | string | number;

export interface ColumnDefinition<T> {
    Name: string,
    Content: (rowItem: T) => selectorResult,
    SortFunction?: ((a: T, b: T) => number)
}

export class TableData<T> {
    Columns: Array<ColumnDefinition<T>>

    constructor(public Data: T[]) {
        this.Columns = [];
    }

    AddColumn(name: string, content: (rowItem: T) => selectorResult) {
        this.Columns.push({ Name: name, Content: content } as ColumnDefinition<T>);
        return this;
    }



    AddSortableColumn<TResult extends selectorResult>(name: string, content: (rowItem: T) => TResult, sortFunction?: ((a: T, b: T) => number) ) {
        const fn =  sortFunction ? sortFunction : (a: T, b: T) => standardSort(content(a), content(b));
        this.Columns.push({ Name: name, Content: content, SortFunction: fn } as ColumnDefinition<T>);
        return this;
    }
}

function standardSort(a: any, b: any) {
    if ((a as string).localeCompare && (b as string).localeCompare)
        return (a as string).localeCompare(b as string);
    
    if (a == b) return 0;
    if (a > b) return 1;
    if (a < b) return -1;
}