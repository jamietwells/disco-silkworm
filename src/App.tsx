import { Component } from 'react';
import { Network, DataSet } from 'vis';
import { parseString } from 'xml2js'
import './App.css';
import { VisOptions } from './VisOptions';
import { ReadFiles } from './ReadFiles';
import { Table, TableData } from './Table';

type State = {
  Files: FileInfo[],
  ShowGraph: boolean,
  Hierarchical: boolean
}

type FileInfo = {
  Name: string,
  Json: string,
  Xml: string,
  Parsed: ProjectFile
}

type ProjectFile = {
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
    }>;
  };
}

class App extends Component<{}, State> {

  readonly accept: string;
  elem: HTMLElement | null;
  model: { nodes: any, edges: any } | null;

  constructor(props: {}) {
    super(props);
    this.state = { Files: [], ShowGraph: true, Hierarchical: VisOptions.layout.hierarchical };
    this.accept = '.csproj,.fsproj,.proj,.vbproj'
    this.elem = null;
    this.model = null;
    this.componentDidUpdate.bind(this);
  }

  componentDidUpdate() {
    if (this.elem && this.model) {
      const data = { nodes: new DataSet(this.model.nodes), edges: new DataSet(this.model.edges) };
      new Network(this.elem, data, VisOptions);
    }
  }

  render() {
    type FilesMapType = { File: FileInfo, ProjectReferences: string[] };

    function ToDependencyMap(files: FileInfo[]): FilesMapType[] {
      function ToDependencyMapInner(file: FileInfo): FilesMapType {
        if (!file.Parsed.Project.ItemGroup)
          return { File: file, ProjectReferences: [] }
        const references = file
          .Parsed
          .Project
          .ItemGroup
          .filter(i => i.ProjectReference)
          .map(i => i.ProjectReference)
          .flat(1)
          .filter(r => r.$.Include)
          .map(r => r.$.Include);

        return { File: file, ProjectReferences: references }
      }
      return files.map(ToDependencyMapInner);
    }

    const instance = this;

    function onLoad(files: Array<{ file: File, content: string }>) {
      const length = files.length;
      const results: FileInfo[] = [];
      function toXml(file: { file: File, content: string }) {
        let faulted = 0;
        function onParsed(error: any, result: any) {
          function notAlreadyAdded(file: FileInfo) {
            return files
              .map(f => f.file.name)
              .filter(n => n === file.Name)
              .length === 0;
          }

          if (error){
            console.error(error);
            faulted++;
          }

          else
            results.push({
              Name: file.file.name,
              Json: JSON.stringify(result, null, 2),
              Xml: file.content,
              Parsed: result as ProjectFile
            });

          if (length === faulted + results.length) {
            instance.setState(old => ({
              ...old,
              Files: old.Files.filter(notAlreadyAdded).concat(results)
            }));
          }
        }
        parseString(file.content, onParsed);
      }
      files.forEach(toXml);
    };

    const filesMap = ToDependencyMap(this.state.Files);

    function fileNameFromPath(path: string) {
      return path.split('\\').pop()!.split('/').pop()!;
    }

    function mapEdges(f: FilesMapType) {
      function mapReferences(r: string) {
        const fileName = fileNameFromPath(r);
        if (!fileName)
          throw 'fileName is null';
        return ({ from: f.File.Name, to: fileName })
      }
      return f.ProjectReferences.map(mapReferences);
    }

    this.model = {
      nodes: filesMap.map(f => ({ id: f.File.Name, label: f.File.Name })),
      edges: filesMap.map(mapEdges).flat(1),
    };

    function graphTableToggleClicked() {
      instance.setState(old => ({ ...old, ShowGraph: !old.ShowGraph }));
    }

    function deleteClicked(file: string, instance: App) {
      return function () {
        instance.setState(old => ({ ...old, Files: old.Files.filter(f => f.Name !== file) }));
      }
    }

    function hierarchicalClicked() {
      VisOptions.layout.hierarchical = !VisOptions.layout.hierarchical;
      instance.setState(old => ({ ...old, Hierarchical: VisOptions.layout.hierarchical }));
    }

    function references(allFiles: FilesMapType[], file: FilesMapType): string[] {
      return allFiles
        .map(f => ({file: f, references: f.ProjectReferences.map(fileNameFromPath)}))
        .filter(f => f.references.some(r => file.File.Name === r))
        .map(f => f.file.File.Name);
    }

    const dependencyInfo = filesMap
      .map(f => ({ ...f, ReferencedBy: references(filesMap, f)}));

    const tableData = new TableData(dependencyInfo)
      .AddSortableColumn("File", f => <><span className='del-button' onClick={deleteClicked(f.File.Name, instance)}>Delete</span>{f.File.Name}</>, (a, b) => a.File.Name.localeCompare(b.File.Name))
      .AddColumn("References", f => <ul>{f.ProjectReferences.map(fileNameFromPath).map(r => <li key={r}>{r}</li>)}</ul> )
      .AddSortableColumn("Number of references", f => f.ProjectReferences.length)
      .AddColumn("Referenced by", f => <ul>{f.ReferencedBy.map(r => <li key={r}>{r}</li>)}</ul>)
      .AddSortableColumn("Number of times referenced", f => f.ReferencedBy.length);

    console.log(instance.state.ShowGraph);
    return <>
      <nav>
        <span className="github-icon">
          <a href="https://github.com/jamietwells/disco-silkworm">
            <img src={require('./assets/GitHub-Mark-Light-32px.png')} />
          </a>
        </span>
        <a href="https://glitch.com/edit/#!/disco-silkworm"><button>Made with Glitch</button></a>
        <ReadFiles onLoad={onLoad} multiple={true} accept={this.accept}>Import project files</ReadFiles>
        <button onClick={graphTableToggleClicked}>{instance.state.ShowGraph ? 'Show table' : 'Show graph'}</button>
        { instance.state.ShowGraph ? (<button onClick={hierarchicalClicked}>{VisOptions.layout.hierarchical ? 'Web layout' : 'Hierarchical'}</button>) : <></>}
      </nav>
      <div hidden={!instance.state.ShowGraph} className='graph' ref={r => this.elem = r}></div>
      <Table hidden={instance.state.ShowGraph} {... tableData} />
    </>
  }
}

export default App;