import React from 'react';
import { FilesMapType } from '../../Helpers/DependencyMapper';
import { ToDictionary } from '../../Helpers/helpers';

export function DependencyList(props: { files: FilesMapType[] }) {
    const rootFiles = props.files
        .filter(f => f.ReferencedBy.length === 0);

    const FilesMap = ToDictionary(props.files, f => f.path.raw, f => f);
    return <ul>{rootFiles.map(f => <File currentFile={f} files={FilesMap} />)}</ul>;
}

function File(props: { currentFile: FilesMapType, files: Map<string, FilesMapType> }) {
    const { currentFile, files } = props;
    return <li>{currentFile.name}<ul>{currentFile.References.map(f => <File currentFile={files.get(f.path.raw)!} files={files} />)}</ul></li>
}
