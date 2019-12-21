import { FileResult } from "../Components/ReadFiles/ReadFiles";
import { parseString } from "xml2js";

export interface ProjectFile {
    Project: {
        $: {
            Sdk: string;
        };
        ItemGroup: Array<{
            ProjectReference: Array<{
                $: {
                    Include: string;
                };
            }>;
        }>;
        PropertyGroup: Array<{
            OutputType: string[];
            TargetFrameworkVersion: string[];
            TargetFramework: string[];
            TargetFrameworks: string[];
        }>;
    };
}

interface FileReferences extends FileInfo {
    References: FileInfo[]
}

export interface FilesMapType extends FileReferences {
    ReferencedBy: FileInfo[]
};

export interface FileInfo extends FileResult {
    Xml: string,
    Parsed: ProjectFile
}

export async function ToDependencyMap(files: FileResult[]): Promise<FilesMapType[]> {

    function toFilesMap(file: FileResult) {
        function createPromise(resolve: (value: { File: FileResult, Parsed: ProjectFile }) => void, reject: (reason?: any) => void){
            function onParsed(error: any, result: ProjectFile) {
                if (error)
                    reject(error);
                else
                    resolve({ File: file, Parsed: result });
            }
            parseString(file.content, onParsed);

        }
        return new Promise(createPromise);
    }
    
    function searchForFile(path: string) {
        const matchingFiles = files
            .filter(f => f.path.isSubPathFor(path.split('\\').filter(p => p !== '..')));
        if (matchingFiles.length === 0)
            return false;
        if (matchingFiles.length > 1)
            return false;
        return matchingFiles[0];
    }

    function findDependencies(file: FileInfo): FileInfo[] {
        if (!file.Parsed.Project.ItemGroup)
            return [];

        return file
            .Parsed
            .Project
            .ItemGroup
            .filter(i => i.ProjectReference)
            .map(i => i.ProjectReference)
            .flat(1)
            .filter(r => r.$.Include)
            .map(r => r.$.Include)
            .map(searchForFile)
            .filter(f => f)
            .map(f => f as FileInfo);
    }

    const projectFiles = await (Promise.all(files.map(toFilesMap)));

    const filesMap = projectFiles
        .map(f => ({ ...f, ...f.File, Xml: f.File.content } as FileInfo))
        .map(f => ({ ...f, References: findDependencies(f) } as FileReferences));

    function findDependants(file: FileReferences): FileInfo[] {
        function ReferenceTheInputFile(current: FileReferences) {
            return current
                .References
                .some(r => r.path.isSubPathFor(file.path.raw.split('/')));
        }

        return filesMap
            .filter(ReferenceTheInputFile);
    }
    
    return filesMap.map(f => ({ ...f, ReferencedBy: findDependants(f) }));
}