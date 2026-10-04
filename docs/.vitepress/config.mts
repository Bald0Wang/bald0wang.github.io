import { defineConfig } from 'vitepress'

// 站点配置参考：https://vitepress.dev/zh/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: 'Bald0Wang',
  description: '个人主页与知识库：记录、整理、沉淀',

  // 本仓库是用户主页仓库（bald0wang.github.io），站点部署在根路径，无需 base。
  // 若以后改成普通项目仓库，请在这里加 base: '/<仓库名>/'。

  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: '主页', link: '/' },
      { text: '知识库', link: '/notes/' },
      { text: '项目', link: '/projects/' },
      { text: '关于', link: '/about' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '知识库',
          items: [
            { text: '笔记目录', link: '/notes/' },
            { text: '写作示例', link: '/notes/example' }
          ]
        }
      ],
      '/projects/': [
        {
          text: '项目',
          items: [{ text: '项目总览', link: '/projects/' }]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Bald0Wang' }
    ],

    // 本地全文搜索，无需任何服务端
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除关键字',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },

    lastUpdated: { text: '最后更新' },
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    footer: {
      message: '记录 · 思考 · 沉淀',
      copyright: 'Copyright © 2026 Bald0Wang'
    }
  }
})
