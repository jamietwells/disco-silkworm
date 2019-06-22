import { FileResult } from "./ReadFiles";

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

export function ToDependencyMap(files: FileInfo[]): FilesMapType[] {
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

    const filesMap = files
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

    return filesMap
        .map(f => ({ ...f, ReferencedBy: findDependants(f) }));
}