import React, { DetailedHTMLProps, TableHTMLAttributes, useState, ReactElement } from 'react';
import { ToArray } from '../../Helpers/helpers';
import './Table.css'

type TableProps<T> = {
    children: ReactElement<TableColumnProps<T>> | ReactElement<TableColumnProps<T>>[];
    Data: T[];
} & DetailedHTMLProps<TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>

interface TableState<T> {
    SortFunction: (a: T, b: T) => number,
    Columns: TableColumnProps<T>[]
}


export function Table<T>(props: TableProps<T>) {
    const { children, Data, ...tableProps } = props;

    const columns = ToArray<ReactElement<TableColumnProps<T>>>(children).map(c => c.props);
    const [tableState, updateSort] = useState<TableState<T>>({ SortFunction: () => 1, Columns: columns });

    function getSortButton(column: TableColumnProps<T>, index: number) {
        if (!column.SortFunction)
            return <></>;
        const { SortFunction, Direction } = column;

        function onClickSortButton() {
            function GetDirection(i: number) {
                if (i === index)
                    return Direction === 'DESC' ? 'ASC' : 'DESC';
                return undefined;
            }

            const newColumns = tableState.Columns
                .map<TableColumnProps<T>>((c, i) => ({
                    ...c,
                    Direction: GetDirection(i)
                }));

            updateSort(old => ({ ...old, Columns: newColumns, SortFunction: Direction === 'ASC' ? SortFunction : (a, b) => SortFunction(b, a) }));
        }

        function GetText() {
            switch(Direction){
                case 'ASC':
                    return '↓';
                case 'DESC':
                    return '↑';
                default:
                    return '-';
            }
        }

        return <button className='column-sort-btn' onClick={onClickSortButton}>{GetText()}</button>
    }

    function mapData(row: T, index: number) {
        return <tr key={index}>{tableState.Columns.map((c, i) => <td key={i}>{c.Content(row)}</td>)}</tr>;
    }

    return <table {...tableProps}>
        <thead>
            <tr>
                {tableState.Columns.map((c, i) => <th key={i}>{c.Name}{getSortButton(c, i)}</th>)}
            </tr>
        </thead>
        <tbody>
            {Data.sort(tableState.SortFunction).map(mapData)}
        </tbody>
    </table>;
}

type selectorResult = JSX.Element | string | number;

export interface TableColumnProps<T> {
    Name: string,
    Content: (rowItem: T) => selectorResult,
    SortFunction?: ((a: T, b: T) => number),
    Direction?: 'ASC' | 'DESC'
}

export function TableColumn<T>(props: TableColumnProps<T>) { return <></>; }

// export class TableData<T> {
//     Columns: Array<ColumnDefinition<T>>

//     constructor(public Data: T[]) {
//         this.Columns = [];
//     }

//     AddColumn(name: string, content: (rowItem: T) => selectorResult) {
//         this.Columns.push({ Name: name, Content: content } as ColumnDefinition<T>);
//         return this;
//     }

//     AddSortableColumn<TResult extends selectorResult>(name: string, content: (rowItem: T) => TResult, sortFunction?: ((a: T, b: T) => number)) {
//         const fn = sortFunction ? sortFunction : (a: T, b: T) => standardSort(content(a), content(b));
//         this.Columns.push({ Name: name, Content: content, SortFunction: fn } as ColumnDefinition<T>);
//         return this;
//     }
// }

// function standardSort(a: any, b: any) {
//     if ((a as string).localeCompare && (b as string).localeCompare)
//         return (a as string).localeCompare(b as string);

//     if (a === b) return 0;
//     if (a > b) return 1;
//     if (a < b) return -1;
// }