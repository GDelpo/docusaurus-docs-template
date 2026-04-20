import React, { useState } from 'react';
import styles from './styles.module.css';

/**
 * Componente TabGroup para mostrar contenido en tabs
 * 
 * Uso en MDX:
 * import { TabGroup, Tab } from '@site/src/components/TabGroup';
 * 
 * <TabGroup>
 *   <Tab label="Windows">
 *     Instrucciones para Windows...
 *   </Tab>
 *   <Tab label="macOS">
 *     Instrucciones para macOS...
 *   </Tab>
 * </TabGroup>
 */

export function Tab({ children }) {
  return <div>{children}</div>;
}

export function TabGroup({ children, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const tabs = React.Children.toArray(children).filter(
    child => React.isValidElement(child) && child.type === Tab
  );

  if (tabs.length === 0) {
    return <div>No tabs found</div>;
  }

  return (
    <div className={styles.tabGroup}>
      <div className={styles.tabList}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`${styles.tabButton} ${activeTab === index ? styles.active : ''}`}
            onClick={() => setActiveTab(index)}
            type="button"
          >
            {tab.props.label || `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {tabs[activeTab]}
      </div>
    </div>
  );
}

export default TabGroup;
