import React, { Component } from 'react';
import * as vis from 'vis';
import * as xml from 'xml2js'
import './App.css';
import { VisOptions } from './VisOptions';
import { ReadFiles } from './ReadFiles';

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
      const data = { nodes: new vis.DataSet(this.model.nodes), edges: new vis.DataSet(this.model.edges) };
      new vis.Network(this.elem, data, VisOptions);
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

          if (error)
            faulted++;

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
        xml.parseString(file.content, onParsed);
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

    return <>
      <ReadFiles onLoad={onLoad} multiple={true} accept={this.accept}>Import Project Files</ReadFiles>
      <button onClick={graphTableToggleClicked}>{instance.state.ShowGraph ? 'Show table' : 'Show graph'}</button>
      <button hidden={!instance.state.ShowGraph} onClick={hierarchicalClicked}>{VisOptions.layout.hierarchical ? 'web layout' : 'hierarchical'}</button>
      <div hidden={!instance.state.ShowGraph} className='graph' ref={r => this.elem = r}></div>

      <table hidden={instance.state.ShowGraph}>
        <thead>
          <tr>
            <td>
              File
            </td>
            <td>
              References
            </td>
            <td>
              Number of references
            </td>
            <td>
              Referenced by
            </td>
            <td>
              Number of times referenced
            </td>
          </tr>
        </thead>
        <tbody>
          {dependencyInfo.map(f => <tr key={f.File.Name}>
            <td>
              <span className='del-button' onClick={deleteClicked(f.File.Name, instance)}>Delete</span>{f.File.Name}
            </td>
            <td>
              <ul>
                {f.ProjectReferences.map(fileNameFromPath).map(r => <li key={r}>{r}</li>)}
              </ul>
            </td>
            <td>
              {f.ProjectReferences.length}
            </td>
            <td>
              <ul>
                {f.ReferencedBy.map(r => <li key={r}>{r}</li>)}
              </ul>
            </td>
            <td>
              {f.ReferencedBy.length}
            </td>
          </tr>)}
        </tbody>
      </table>
    </>
  }
}

export default App;