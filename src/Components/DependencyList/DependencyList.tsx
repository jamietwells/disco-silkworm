import React, { useState } from 'react';
import { FilesMapType } from '../../Helpers/DependencyMapper';
import { ToDictionary } from '../../Helpers/helpers';
import './DependencyList.css';

export function DependencyList(props: { files: FilesMapType[] }) {
    const rootFiles = props.files
        .filter(f => f.ReferencedBy.length === 0);

    const FilesMap = ToDictionary(props.files, f => f.path.raw, f => f);
    return <ul>{rootFiles.map(f => <File currentFile={f} files={FilesMap} />)}</ul>;
}

function File(props: { currentFile: FilesMapType, files: Map<string, FilesMapType> }) {
    const [isExpanded, setExpanded] = useState(false);
    const { currentFile, files } = props;
    return <li><ToggleButton initialState={isExpanded} onStateChange={setExpanded}/> {currentFile.name}<ul>{currentFile.References.filter(_ => isExpanded).map(f => <File currentFile={files.get(f.path.raw)!} files={files} />)}</ul></li>
}

function ToggleButton(props: { initialState: boolean,  label?:{ Open: string, Closed: string }, onStateChange: (state: boolean) => void }) {
    const [state, setOpenClosed] = useState(props.initialState);
    const labels = (props.label || { Open: '-', Closed: '+' });
    function SetState(newState: boolean){
        return function(){
            props.onStateChange(newState);
            setOpenClosed(newState);
        }
    }
    if(state)
        return <button onClick={SetState(false)}>{labels.Open}</button>    
    return <button onClick={SetState(true)}>{labels.Closed}</button>
}
