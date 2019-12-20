import { ToArray, ToDictionary } from "../../Helpers/helpers";
import React, { ReactElement, useState } from "react";

export type NavigationTabProps = { tabName: string, children: JSX.Element };

export function NavigationTab(props: NavigationTabProps) {
  return <>{props.tabName}: {props.children}</>;
}

export function Navigation(props: { children: ReactElement<NavigationTabProps> | ReactElement<NavigationTabProps>[] }) {
  const children = ToArray(props.children);
  const [selected, SelectNext] = useState(children[0].props.tabName);
  const map = ToDictionary(children, i => i.props.tabName, i => i.props.children);
  function GetOnClick(tab: ReactElement<NavigationTabProps>) {
    return function () {
      SelectNext(tab.props.tabName);
    };
  }
  const tabs = children.map(i => <button onClick={GetOnClick(i)}>{i.props.tabName}</button>);
  return <><nav>{tabs}</nav><section className="tab-content" >{map.get(selected)}</section></>;
}