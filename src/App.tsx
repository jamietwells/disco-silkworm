import React, { Component } from 'react';
import { Network, DataSet, Edge, Node } from 'vis';
import { parseString } from 'xml2js'
import './App.css';
import { VisOptions } from './VisOptions';
import { ReadFiles, FileResult } from './ReadFiles';
import { Table, TableData } from './Table';
import { FileInfo, ProjectFile, ToDependencyMap, FilesMapType } from './DependencyMapper';

type State = {
  Files: FileInfo[],
  ShowGraph: boolean,
  Hierarchical: boolean
}

class App extends Component<{}, State> {

  readonly accept: string[];
  elem: HTMLElement | null;
  model: { nodes: Array<{ id: string, label: string }>, edges: Array<{ from: string, to: string }> } | null;

  constructor(props: {}) {
    super(props);
    this.state = { Files: [], ShowGraph: false, Hierarchical: VisOptions.layout.hierarchical };
    this.accept = ['.csproj', '.fsproj', '.proj', '.vbproj']
    this.elem = null;
    this.model = null;
    this.componentDidUpdate.bind(this);
  }

  componentDidUpdate() {
    if (this.elem && this.model) {
      const data = {
        nodes: new DataSet<Node>(this.model.nodes),
        edges: new DataSet<Edge>(this.model.edges)
      };
      new Network(this.elem, data, VisOptions);
    }
  }

  render() {
    const instance = this;

    function onLoad(files: Array<FileResult>) {
      const length = files.length;
      const results: FileInfo[] = [];
      function toXml(file: FileResult) {
        let faulted = 0;
        function onParsed(error: any, result: any) {
          function notAlreadyAdded(file: FileInfo) {
            return files
              .map(f => f.path)
              .filter(n => n === file.path)
              .length === 0;
          }

          if (error) {
            console.error(error);
            faulted++;
          }

          else {
            results.push({
              ...file,
              Json: JSON.stringify(result, null, 2),
              Xml: file.content,
              Parsed: result as ProjectFile
            });
          }

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

    function mapEdges(f: FilesMapType) {
      function mapReferences(r: FileInfo) {
        return ({ from: f.path.raw, to: r.path.raw })
      }
      return f.References.map(mapReferences);
    }

    this.model = {
      nodes: filesMap.map(f => ({ id: f.path.raw, label: f.path.name })),
      edges: filesMap.map(mapEdges).flat(1),
    };

    function graphTableToggleClicked() {
      instance.setState(old => ({ ...old, ShowGraph: !old.ShowGraph }));
    }

    function deleteClicked(file: string, instance: App) {
      return function () {
        instance.setState(old => ({ ...old, Files: old.Files.filter(f => f.path.raw !== file) }));
      }
    }

    function hierarchicalClicked() {
      VisOptions.layout.hierarchical = !VisOptions.layout.hierarchical;
      instance.setState(old => ({ ...old, Hierarchical: VisOptions.layout.hierarchical }));
    }

    function getTargetFramework(file: FilesMapType) {
      const propertyGroups = file.Parsed.Project.PropertyGroup;

      return propertyGroups.map(p => p.TargetFramework)
        .flat(1)
        .concat(propertyGroups.map(p => p.TargetFrameworks).flat(1))
        .filter(t => t)
        .map(t => t.split(";"))
        .filter(t => t && t.length > 0)
        .flat();
    }

    function renderFileCell(f: any) {
      return <>
        <span className='del-button' onClick={deleteClicked(f.path.raw, instance)}>
          Delete
        </span>
        {f.path.name}
      </>;
    }
    const tableData = new TableData(filesMap)
      .AddSortableColumn("File", renderFileCell, (a, b) => a.path.raw.localeCompare(b.path.raw))
      .AddColumn("Framework Version", f => <ul>{getTargetFramework(f).map((t, i) => <li key={i}>{t}</li>)}</ul>)
      .AddColumn("References", f => <ul>{f.References.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddSortableColumn("Number of references", f => f.References.length)
      .AddColumn("Referenced by", f => <ul>{f.ReferencedBy.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddSortableColumn("Number of times referenced", f => f.ReferencedBy.length);

    return <>
      <nav>
        <span className="github-icon">
          <a href="https://github.com/jamietwells/disco-silkworm">
            <img alt="github logo" src={require('./assets/GitHub-Mark-Light-32px.png')} />
          </a>
        </span>
        <a href="https://glitch.com/edit/#!/disco-silkworm"><button>Made with Glitch</button></a>
        <ReadFiles onLoad={onLoad} multiple={true} accept={this.accept}>Import project files</ReadFiles>
        <button onClick={graphTableToggleClicked}>{instance.state.ShowGraph ? 'Show table' : 'Show graph'}</button>
        {instance.state.ShowGraph ? (<button onClick={hierarchicalClicked}>{VisOptions.layout.hierarchical ? 'Web layout' : 'Hierarchical'}</button>) : <></>}
      </nav>
      <div hidden={!instance.state.ShowGraph} className='graph' ref={r => this.elem = r}></div>
      <Table hidden={instance.state.ShowGraph} {...tableData} />
    </>
  }
}

export default App;