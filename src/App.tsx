import React, { Component, ChangeEvent } from 'react';
import { Network, DataSet, Edge, Node, Options } from 'vis';
import { parseString } from 'xml2js'
import './App.css';
import { VisOptions } from './VisOptions';
import { ReadFiles, FileResult } from './ReadFiles';
import { Table, TableData } from './Table';
import { FileInfo, ProjectFile, ToDependencyMap, FilesMapType } from './DependencyMapper';
import { ReactComponent as Logo } from './assets/github-icon-dark.svg';

type State = {
  Files: FileInfo[],
  ShowGraph: boolean,
  Hierarchical: boolean,
  SelectedNode: { nodeName?: string; direction: 'up' | 'down' };
  FilterText?: string
}

type IdLabelType = { id: string, label: string };

class App extends Component<{}, State> {

  readonly accept: string[];
  graphElem: HTMLElement | null;
  model: { nodes: IdLabelType[], edges: Array<{ from: string, to: string }> } | null;

  constructor(props: {}) {
    super(props);
    this.state = {
      Files: [],
      ShowGraph: false,
      Hierarchical: VisOptions.layout.hierarchical,
      SelectedNode: {
        direction: 'up'
      }
    };
    this.accept = ['.csproj', '.fsproj', '.proj', '.vbproj']
    this.graphElem = null;
    this.model = null;
  }

  reflowNetwork(instance: App) {
    instance.componentDidUpdate = function () {
      reflowNetworkInner();
      instance.componentDidUpdate = function () { };
    }

    function reflowNetworkInner() {
      if (!instance.graphElem || !instance.model)
        return;

      if (!(window as any).visOptions)
        (window as any).visOptions = VisOptions;

      const data = {
        nodes: new DataSet<Node>(),
        edges: new DataSet<Edge>(instance.model.edges)
      };
      const network = new Network(instance.graphElem, data, (window as any).visOptions);
      if (!(window as any).SetOptions) {
        (window as any).SetOptions = function (options?: Options) {
          if (options)
            network.setOptions(options);
          network.setOptions((window as any).visOptions);
        }
      }
      const delayBetweenNodes = 100;
      (<T,>(items: T[], callback: (item: T) => void) => {
        const [head, ...tail] = items;
        performActionOnDelay(head, tail);

        function performActionOnDelay(head: T, tail: T[]) {
          if (!head)
            return;

          function callbackInner() {
            const [nextHead, ...nextTail] = tail;
            performActionOnDelay(nextHead, nextTail);
          }

          setTimeout(callbackInner, delayBetweenNodes);
          callback(head);
        }
      })(instance.model.nodes, callback);

      function callback(n: IdLabelType) {
        function randomPosition() {
          return ((Math.random() - 0.5) * 10);
        }
        data.nodes.update({ ...n, x: randomPosition(), y: randomPosition() });
        network.focus(n.id);
      }

      network.on("dragEnd", function (params) {
        if (params.nodes.length === 0 || !VisOptions.physics.enabled)
          return;

        const id = params.nodes[0] as string;
        const node = instance.model!.nodes.filter(n => n.id === id)[0];
        const position = network.getPositions(id);
        data.nodes.update({...node, physics: false, ...position });
      });
      
      network.on("doubleClick", function (params) {
        instance.reflowNetwork(instance);
        instance.setState(prev => ({
          ...prev,
          SelectedNode: {
            ...prev.SelectedNode,
            nodeName: (params.nodes as string[])[0]
          }
        }));
      });
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
              .map(f => f.path.raw)
              .filter(n => n === file.path.raw)
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
            instance.reflowNetwork(instance);
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

    if (this.state.SelectedNode.nodeName) {
      const { direction, nodeName: name } = this.state.SelectedNode;
      const node = filesMap.filter(f => f.path.raw === name)[0];
      if (!node) {
        instance.reflowNetwork(instance);
        this.setState(prev => ({ ...prev, SelectedNode: { ...prev.SelectedNode, nodeName: undefined } }));
        return <></>;
      }

      const directionFunction: ((f: FilesMapType) => FileInfo[]) =
        direction === 'up'
          ? f => f.ReferencedBy
          : f => f.References;


      const addNodes = function (current: FilesMapType[], results: FilesMapType[]): FilesMapType[] {
        function findMatchingFileMap(file: FileInfo): FilesMapType {
          return filesMap
            .filter(f => f.path.raw === file.path.raw)[0];
        }

        current.forEach(c => {

          const next = directionFunction(c)
            .map(findMatchingFileMap);

          addNodes(next, results)
            .concat(c)
            .forEach(n => {
              if (results.filter(r => r.path.raw === n.path.raw).length === 0)
                results.push(n);
            });
        });
        return results;
      };

      const nodes = addNodes([node], []);

      this.model = {
        nodes: nodes.map(f => ({ id: f.path.raw, label: f.path.name })),
        edges: nodes.map(mapEdges).flat(1),
      };

    }
    else {
      this.model = {
        nodes: filesMap.map(f => ({ id: f.path.raw, label: f.path.name })),
        edges: filesMap.map(mapEdges).flat(1),
      };
    }

    function graphTableToggleClicked() {
      instance.setState(old => ({ ...old, ShowGraph: !old.ShowGraph }));
    }

    function swapDirection() {
      instance.reflowNetwork(instance);
      instance.setState(old => ({
        ...old,
        SelectedNode: {
          ...old.SelectedNode,
          direction: old.SelectedNode.direction === 'up' ? 'down' : 'up'
        }
      }));
    }

    function deleteClicked(file: string, instance: App) {
      return function () {
        instance.reflowNetwork(instance);
        instance.setState(old => ({
          ...old,
          Files: old.Files.filter(f => f.path.raw !== file)
        }))
      }
    }

    function hierarchicalClicked() {
      if (VisOptions.layout.hierarchical) {
        VisOptions.layout.hierarchical = false;
      }
      else {
        VisOptions.layout.hierarchical = {
          sortMethod: 'directed'
        };
      }
      instance.reflowNetwork(instance);
      instance.setState(old => ({ ...old, Hierarchical: VisOptions.layout.hierarchical }));
    }

    function getTargetFramework(file: FilesMapType) {
      const propertyGroups = file.Parsed.Project.PropertyGroup;

      return propertyGroups
        .map(p => p.TargetFramework)
        .concat(propertyGroups.map(p => p.TargetFrameworkVersion))
        .flat(1)
        .concat(propertyGroups.map(p => p.TargetFrameworks).flat(1))
        .filter(t => t)
        .map(t => t.split(";"))
        .filter(t => t && t.length > 0)
        .flat();
    }

    function renderControlCell(instance: App) {
      function setNodeName(name?: string) {
        return function () {
          instance.reflowNetwork(instance);
          instance.setState(prev => ({
            ...prev,
            SelectedNode: {
              ...prev.SelectedNode,
              nodeName: name
            }
          }));
        }
      }

      return function (f: FilesMapType) {
        return <>
          <span className='del-button button' onClick={deleteClicked(f.path.raw, instance)}>
            Delete
        </span>
          <span
            hidden={f.path.raw === instance.state.SelectedNode.nodeName}
            className='focus-button  button' onClick={setNodeName(f.path.raw)}>
            Focus
        </span>
          <span
            hidden={instance.state.SelectedNode.nodeName === undefined || f.path.raw !== instance.state.SelectedNode.nodeName}
            className='focus-button  button'
            onClick={setNodeName()}>
            Unfocus
        </span>
        </>
      }
    }

    const filterText = instance.state.FilterText;

    function FindTopLevelReferences(file: FilesMapType, files: FilesMapType[]) {
      const filesMap: { [rawFilePath: string]: FilesMapType } = {};
      for (const f of files)
        filesMap[f.path.raw] = f;

      function inner(file: FilesMapType): FilesMapType[] {
        const nextArr = file.ReferencedBy.map(f => filesMap[f.path.raw]);
        const topLevel = nextArr.filter(r => r.ReferencedBy.length === 0);
        const next = nextArr
          .filter(r => r.ReferencedBy.length !== 0)
          .map(n => inner(n))
          .flat()
          .filter(n => topLevel.map(t => t.path.raw).indexOf(n.path.raw) === -1);

        return topLevel.concat(next);
      };

      return inner(file);

    }

    function sortBooleans<T>(projection: (input: T) => boolean) {
      return function (first: T, second: T) {
        const a = projection(first);
        const b = projection(second);
        if ((a && b) || (!a && !b))
          return 0;
        if (a)
          return 1;
        return 0;
      }
    }

    const tableData = new TableData(filesMap.filter(f => !filterText || filterText.length === 0 || f.path.name.indexOf(filterText) !== -1 || f.path.dir.indexOf(filterText) !== -1))
      .AddSortableColumn("Project", f => f.path.name, (a, b) => a.path.name.localeCompare(b.path.name))
      .AddSortableColumn("Path", f => f.path.dir, (a, b) => a.path.dir.localeCompare(b.path.dir))
      .AddSortableColumn("Top Level", f => <p>{f.ReferencedBy.length === 0 ? 'Yes' : 'No'}</p>, sortBooleans(f => f.ReferencedBy.length === 0))
      .AddColumn("Framework version", f => <ul>{getTargetFramework(f).map((t, i) => <li key={i}>{t}</li>)}</ul>)
      .AddColumn("References", f => <ul>{f.References.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddSortableColumn("Number of references", f => f.References.length)
      // .AddColumn("Lowest Level Reference", f => <ul>{FindLowestLevelReferences(f, filesMap).map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddColumn("Referenced by", f => <ul>{f.ReferencedBy.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddSortableColumn("Number of times referenced", f => f.ReferencedBy.length)
      .AddColumn("Top Level Dependant", f => <ul>{FindTopLevelReferences(f, filesMap).map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddColumn("Graph controls", renderControlCell(this));

    function shouldShow(value: boolean): 'hidden' | '' {
      return value ? '' : 'hidden';
    }

    function filterTable(event: ChangeEvent<HTMLInputElement>) {
      const text = event.currentTarget.value;
      instance.setState(prev => ({ ...prev, FilterText: text }));
    }

    return <>
      <nav>
        <span className="github-icon">
          <a href="https://github.com/jamietwells/disco-silkworm">
            <Logo className="github-icon" />
          </a>
        </span>
        <a href="https://glitch.com/edit/#!/disco-silkworm"><button>Made with Glitch</button></a>
        <ReadFiles onLoad={onLoad} accept={instance.accept}>Import project files</ReadFiles>
        <button onClick={graphTableToggleClicked}>{instance.state.ShowGraph ? 'Show table' : 'Show graph'}</button>
        <button className={shouldShow(instance.state.ShowGraph)} onClick={hierarchicalClicked}>{VisOptions.layout.hierarchical ? 'Web layout' : 'Hierarchical'}</button>
        <button className={shouldShow(instance.state.ShowGraph && instance.state.SelectedNode.nodeName !== undefined)} onClick={swapDirection}>{instance.state.SelectedNode.direction === 'up' ? 'Show dependencies' : 'Show dependants'}</button>
      </nav>
      <div className={'graph ' + shouldShow(instance.state.ShowGraph)} ref={r => instance.graphElem = r}></div>
      <input placeholder="Search for a project" className={'text-input ' + shouldShow(!instance.state.ShowGraph)} type="text" onChange={filterTable} />
      <Table className={shouldShow(!instance.state.ShowGraph)} {...tableData} />
    </>
  }
}

export default App;