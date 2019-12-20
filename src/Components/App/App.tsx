import { Navigation, NavigationTab } from "../Navigation/Navigation";
import React, { useState } from 'react';
import './App.css';
import { ReadFiles, FileResult } from "../ReadFiles/ReadFiles";
import { FilesMapType, ToDependencyMap } from "../../DependencyMapper";
import ProjectsTable from "../ProjectsTable/ProjectsTable";

export default function App() {
    const [files, onFilesLoad] = useState<FilesMapType[]>([]);
    const accept = ['.csproj', '.fsproj', '.proj', '.vbproj'];

    async function onLoad(loadedFiles: Array<FileResult>) {
        onFilesLoad(await ToDependencyMap(loadedFiles));
    }
    
    return (
        <>
            <ReadFiles onLoad={onLoad} accept={accept}>Load Files</ReadFiles>
            <Navigation>
                <NavigationTab tabName="Table">
                    <ProjectsTable files={files} />
                </NavigationTab>
            </Navigation>
        </>
    );
}