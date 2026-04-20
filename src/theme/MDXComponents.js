/**
 * Global MDX components scope.
 *
 * Components listed here are available in every .md/.mdx file
 * without needing explicit import statements. This is essential
 * for CMS-published posts that use component snippets.
 */
import MDXComponents from '@theme-original/MDXComponents';
import Alert from '@site/src/components/Alert';
import Card from '@site/src/components/Card';
import CardGrid from '@site/src/components/CardGrid';
import Kbd from '@site/src/components/Kbd';
import { Steps, Step } from '@site/src/components/Steps';
import TabGroup, { Tab } from '@site/src/components/TabGroup';
import Video from '@site/src/components/Video';
import DownloadButton from '@site/src/components/DownloadButton';
import Highlight from '@site/src/components/Highlight';

export default {
  ...MDXComponents,
  Alert,
  Card,
  CardGrid,
  Kbd,
  Steps,
  Step,
  TabGroup,
  Tab,
  Video,
  DownloadButton,
  Highlight,
};
