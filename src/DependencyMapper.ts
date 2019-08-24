import { FileResult } from "./ReadFiles";
import { IStatusHandler } from "./Status";

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

export interface FileReferences extends FileInfo {
    References: FileInfo[]
}

export interface FilesMapType extends FileReferences {
    ReferencedBy: FileInfo[]
};

export interface FileInfo extends FileResult {
    Json: string,
    Xml: string,
    Parsed: ProjectFile
}

export function ToDependencyMap(files: FileInfo[], statusHandler: IStatusHandler): FilesMapType[] {
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

        statusHandler.setMessage("Finding dependencies")
        var result = file
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

        statusHandler.clear();
        return result;
    }

    const filesMap = files
        .map(f => ({ ...f, References: findDependencies(f) } as FileReferences));

    const count = {
        current: 1,
        total: filesMap.length
    }

    function findDependants(file: FileReferences): FileInfo[] {
        function ReferenceTheInputFile(current: FileReferences) {
            return current
                .References
                .some(r => r.path.isSubPathFor(file.path.raw.split('/')));
        }

        statusHandler.setMessage(`Finding dependants for ${file.name} ${count.current++} of ${count.total}`)
        return filesMap
            .filter(ReferenceTheInputFile);
    }

    var result = filesMap
        .map(f => ({ ...f, ReferencedBy: findDependants(f) }));
    
    statusHandler.clear()

    return result;
}