import { Navigation, NavigationTab } from "../Navigation/Navigation";
import React, { useState } from 'react';
import './App.css';
import { ReadFiles, FileResult } from "../ReadFiles/ReadFiles";
import { FilesMapType, ToDependencyMap } from "../../Helpers/DependencyMapper";
import ProjectsTable from "../ProjectsTable/ProjectsTable";
import { ReactComponent as Logo } from '../../assets/github-icon-dark.svg';
import { DependencyList } from "../DependencyList/DependencyList";

export default function App() {
    const [files, onFilesLoad] = useState<FilesMapType[]>([]);
    const accept = ['.csproj', '.fsproj', '.proj', '.vbproj'];

    async function onLoad(loadedFiles: Array<FileResult>) {
        onFilesLoad(await ToDependencyMap(loadedFiles));
    }

    return (
        <>
            <div className="icon-row">
                <span className="github-icon">
                    <a href="https://github.com/jamietwells/disco-silkworm">
                        <Logo className="github-icon" />
                    </a>
                </span>
                <a href="https://netlify.com"><button>Hosted on Netlify</button></a>
                <ReadFiles onLoad={onLoad} accept={accept}>Load Files</ReadFiles>
            </div>
            <Navigation>
                <NavigationTab tabName="Table">
                    <ProjectsTable files={files} />
                </NavigationTab>
                <NavigationTab tabName="List">
                    <DependencyList files={files} />
                </NavigationTab>
            </Navigation>
        </>
    );
}