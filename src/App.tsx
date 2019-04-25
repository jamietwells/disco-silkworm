import React, { Component, ChangeEvent } from 'react';
import * as vis from 'vis';
import * as xml from 'xml2js'
import './App.css';
import { VisOptions } from './VisOptions';

const ReadFiles = (props: { children: string, onLoad: (file: File, content: string) => void, multiple?: boolean, accept?: string, className?: string, id?: string }) => {
  type ICollection<T> = {
    length: number;
    [index: number]: T;
  }

  function ToArray<TItem>(collection: ICollection<TItem>) {
    return ToArrayAny(collection, c => c.length, (c, i) => c[i]);
  }

  type LengthSelector<T> = (collection: T) => number;
  type ItemSelector<T, TResult> = (collection: T, index: number) => TResult;

  function ToArrayAny<T, TResult>(collection: T, lengthSelector: LengthSelector<T>, itemSelector: ItemSelector<T, TResult>): TResult[] {
    const result: TResult[] = [];
    for (let i = 0; i < lengthSelector(collection); i++)
      result.push(itemSelector(collection, i));
    return result;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files)
      ToArray(event.currentTarget.files)
        .map(f => ({
          File: f,
          Reader: new FileReader()
        }))
        .forEach(i => {
          i.Reader.addEventListener("loadend", () => props.onLoad(i.File, (i.Reader.result as string)));
          i.Reader.readAsText(i.File);
        });
  }

  let inputElement: HTMLInputElement | null;
  return <>
    <input type='file' id='folder' hidden={true} className='input-file hidden' accept={props.accept} onChange={handleChange} multiple={props.multiple} ref={input => inputElement = input} />
    <button id={props.id} className={props.className} onClick={() => {
      if (inputElement)
        (inputElement).click();
    }}>{props.children}</button>
  </>;
}

type State = {
  Files: FileInfo[],
  ShowGraph: boolean
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
    this.state = { Files: [], ShowGraph: true };
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
        if(!file.Parsed.Project.ItemGroup)
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

    function onLoad(file: File, content: string) {
      xml.parseString(content, (e, r) => {
        if (e)
          console.error(e);
        if (r) {
          instance.setState(old => ({
            ... old,
            Files: old.Files.filter(f => f.Name !== file.name).concat({
              Name: file.name,
              Json: JSON.stringify(r, null, 2),
              Xml: content,
              Parsed: r
            })
          }));
        }
      });
    };

    const filesMap = ToDependencyMap(this.state.Files);

    function mapEdges(f: FilesMapType) {
      function mapReferences(r: string) {
        const fileName = r.split('\\').pop()!.split('/').pop();
        if(!fileName)
          throw "fileName is null";
        return ({ from: f.File.Name, to: fileName })
      }
      return f.ProjectReferences.map(mapReferences);
    }
    this.model = {
      nodes: filesMap.map(f => ({ id: f.File.Name, label: f.File.Name })),
      edges: filesMap.map(mapEdges).flat(1),
    };

    function onClick(){
      instance.setState(old => ({ ... old, ShowGraph: !old.ShowGraph }));
    }

    return <>
      <ReadFiles onLoad={onLoad} multiple={true} accept={this.accept}>Import Project Files</ReadFiles>
      <button onClick={onClick}>{instance.state.ShowGraph ? "Show table" : "Show graph"}</button>
      <div hidden={!instance.state.ShowGraph} className="graph" ref={r => this.elem = r}></div>
      <table hidden={instance.state.ShowGraph}>
        <thead>
          <tr>
            <td>
              File
            </td>
            <td>
              References
            </td>
          </tr>
        </thead>
        <tbody>
          {filesMap.map(f => <tr key={f.File.Name}>
            <td>
              {f.File.Name}
            </td>
            <td>
              <ul>
                {f.ProjectReferences.map(r => <li key={r}>{r}</li>)}
              </ul>
            </td>
          </tr>)}
        </tbody>
      </table>
    </>
  }
}

export default App;