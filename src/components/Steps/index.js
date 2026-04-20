import React from 'react';
import styles from './styles.module.css';

/**
 * Componente Steps para mostrar pasos numerados visualmente atractivos
 * 
 * Uso en MDX:
 * import { Steps, Step } from '@site/src/components/Steps';
 * 
 * <Steps>
 *   <Step title="Descargar archivo">
 *     Descarga el ejecutable desde el enlace...
 *   </Step>
 *   <Step title="Ejecutar">
 *     Haz doble clic en el archivo...
 *   </Step>
 *   <Step title="Configurar">
 *     Ingresa tus credenciales...
 *   </Step>
 * </Steps>
 */

export function Step({ title, children, numero }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepIndicator}>
        <span className={styles.stepNumber}>{numero}</span>
        <div className={styles.stepLine} />
      </div>
      <div className={styles.stepContent}>
        <h4 className={styles.stepTitle}>{title}</h4>
        <div className={styles.stepBody}>{children}</div>
      </div>
    </div>
  );
}

export function Steps({ children }) {
  // Agregar número a cada Step
  const stepsWithNumbers = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { numero: index + 1 });
    }
    return child;
  });

  return <div className={styles.steps}>{stepsWithNumbers}</div>;
}

export default Steps;
