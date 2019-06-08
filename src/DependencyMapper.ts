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

export interface FileReferences {
    File: FileInfo,
    References: FileDetails[]
}

export interface FilesMapType extends FileReferences {
    ReferencedBy: FileDetails[]
};

export interface FileDetails {
    Name: string,
    Path: string
}

export interface FileInfo {
    Name: string,
    Json: string,
    Xml: string,
    Parsed: ProjectFile
}

export function ToDependencyMap(files: FileInfo[]): FilesMapType[] {
    function fileNameFromPath(path: string) {
        const name = path.split('\\').pop()!.split('/').pop()!;
        return { Name: name, Path: path };
    }

    function ToDependencyMapInner(file: FileInfo) {
        if (!file.Parsed.Project.ItemGroup)
            return { File: file, References: [] }

        const references = file
            .Parsed
            .Project
            .ItemGroup
            .filter(i => i.ProjectReference)
            .map(i => i.ProjectReference)
            .flat(1)
            .filter(r => r.$.Include)
            .map(r => r.$.Include)
            .map(fileNameFromPath);

        return { File: file, References: references };
    }

    const filesMap = files.map(ToDependencyMapInner);

    function findReferences(file: FileReferences) {
        return filesMap
            .map(f => ({ file: f, references: f.References.map(f => f.Name) }))
            .filter(f => f.references.some(r => file.File.Name === r))
            .map(f => f.file.File.Name)
            .map(fileNameFromPath);
    }

    return filesMap
        .map(f => ({ ...f, ReferencedBy: findReferences(f) }));
}