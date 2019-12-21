import React from 'react';
import { FilesMapType } from '../../Helpers/DependencyMapper';
import { Table, TableColumn } from '../Table/Table';

export default function ProjectsTable(props: {files: FilesMapType[]}) {

    function getTargetFramework(file: FilesMapType) {
        const propertyGroups = file.Parsed.Project.PropertyGroup;

        return propertyGroups
            .map(p => p.TargetFramework)
            .concat(propertyGroups.map(p => p.TargetFrameworkVersion))
            .flat(1)
            .concat(propertyGroups.map(p => p.TargetFrameworks).flat(1))
            .filter(t => t)
            .map(t => t.split(";"))
            .filter(t => t && t.length > 0)
            .flat();
    }

    function sortBooleans<T>(projection: (input: T) => boolean) {
        return function (first: T, second: T) {
            const a = projection(first);
            const b = projection(second);
            if ((a && b) || (!a && !b))
                return 0;
            if (a)
                return 1;
            return 0;
        }
    }

    function FindTopLevelReferences(file: FilesMapType, files: FilesMapType[]) {
        const filesMap: { [rawFilePath: string]: FilesMapType } = {};
        for (const f of files)
            filesMap[f.path.raw] = f;

        function inner(file: FilesMapType): FilesMapType[] {
            const nextArr = file.ReferencedBy.map(f => filesMap[f.path.raw]).filter(r => r);
            const topLevel = nextArr.filter(r => r.ReferencedBy.length === 0);
            const next = nextArr
                .filter(r => r.ReferencedBy.length !== 0)
                .map(n => inner(n))
                .flat()
                .filter(n => topLevel.map(t => t.path.raw).indexOf(n.path.raw) === -1);

            return topLevel.concat(next);
        };

        return inner(file);
    }

    const {files} = props;

    return (
        <Table Data={files}>
            <TableColumn<FilesMapType> Name="Project" Content={f => f.path.name} SortFunction={(a, b) => a.path.name.localeCompare(b.path.name)} />
            <TableColumn<FilesMapType> Name="Path" Content={f => f.path.dir} SortFunction={(a, b) => a.path.dir.localeCompare(b.path.dir)} />
            <TableColumn<FilesMapType> Name="Top Level" Content={f => <p>{f.ReferencedBy.length === 0 ? 'Yes' : 'No'}</p>} SortFunction={sortBooleans(f => f.ReferencedBy.length === 0)} />
            <TableColumn<FilesMapType> Name="Framework version" Content={f => <ul>{getTargetFramework(f).map((t, i) => <li key={i}>{t}</li>)}</ul>} />
            <TableColumn<FilesMapType> Name="References" Content={f => <ul>{f.References.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>} />
            <TableColumn<FilesMapType> Name="Number of references" Content={f => f.References.length} SortFunction={f => f.References.length} />
            <TableColumn<FilesMapType> Name="Referenced by" Content={f => <ul>{f.ReferencedBy.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>} />
            <TableColumn<FilesMapType> Name="Number of times referenced" Content={f => f.ReferencedBy.length} SortFunction={f => f.ReferencedBy.length} />
            <TableColumn<FilesMapType> Name="Top Level Dependant" Content={f => <ul>{FindTopLevelReferences(f, files).map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>} />
        </Table>
    );
}