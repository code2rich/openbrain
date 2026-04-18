import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import WikiHome from './components/WikiHome.vue'
import Graph from './components/Graph.vue'
import KnowledgeMap from './components/KnowledgeMap/KnowledgeMap.vue'
import TagFilter from './components/TagFilter.vue'
import RandomPage from './components/RandomPage.vue'
import CategoryList from './components/CategoryList.vue'
import LogPage from './components/LogPage.vue'
import OutputStudio from './components/OutputStudio.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('WikiHome', WikiHome)
    app.component('Graph', Graph)
    app.component('KnowledgeMap', KnowledgeMap)
    app.component('TagFilter', TagFilter)
    app.component('RandomPage', RandomPage)
    app.component('CategoryList', CategoryList)
    app.component('LogPage', LogPage)
    app.component('OutputStudio', OutputStudio)
  },
} satisfies Theme
