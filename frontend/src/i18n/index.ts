import { createI18n } from 'vue-i18n'

const messages = {
  'zh-CN': {
    auth: {
      login: '登录',
      subtitle: '欢迎回来，请登录您的账号',
      email: '邮箱',
      password: '密码',
      signIn: '登录',
      loginFailed: '登录失败，请检查邮箱和密码',
      logout: '退出登录',
    },
    app: {
      name: '棣友',
      menu: {
        home: '主页',
        history: '历史',
        media: '照片/视频',
        works: '文集/诗集',
        people: '队员',
        upload: '上传资料',
        planner: '年会策划',
      },
      empty: '暂无内容',
      search: '搜索',
      all: '全部',
    },
    works: {
      articles: '文章',
      poems: '诗集',
      author: '作者',
      year: '年份',
      noWorks: '没有找到符合条件的作品'
    },
    people: {
      family: '家庭',
      red: '红队',
      blue: '蓝队',
      all: '全部队员',
      familyTree: '家谱',
      stats: '数据',
    },
    upload: {
      title: '上传资料',
      member: '上传队员',
      media: '上传照片/视频',
      work: '上传文章/诗集',
      match: '上传比赛数据',
      chronicle: '上传大事记',
      submit: '提交',
      success: '上传成功',
      error: '上传失败',
    },
    planner: {
      title: '年会策划',
      generate: '生成计划',
      ask: '询问 Qwen',
      placeholder: '输入您的要求...',
    },
    home: {
      title: '棣友足球队',
      subtitle: '内部网站（移动端优先 / 可安装为 PWA）',
      welcome: '欢迎, {name}',
      nav: {
        historyDesc: '查看历年大事记与照片',
        mediaDesc: '浏览所有照片和视频',
        worksDesc: '阅读文章与诗词',
        peopleDesc: '查看队员与家庭信息',
        uploadDesc: '上传新的内容资料',
        plannerDesc: 'AI 年会策划助手',
      }
    },
  },
  en: {
    auth: {
      login: 'Login',
      subtitle: 'Welcome back, please sign in to your account',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign In',
      loginFailed: 'Login failed, please check your email and password',
      logout: 'Log Out',
    },
    app: {
      name: 'DiYou',
      menu: {
        home: 'Home',
        history: 'History',
        media: 'Photos/Videos',
        works: 'Writings/Poems',
        people: 'Members',
        upload: 'Upload',
        planner: 'Annual Plan',
      },
      empty: 'No content yet',
      search: 'Search',
      all: 'All',
    },
    works: {
      articles: 'Articles',
      poems: 'Poems',
      author: 'Author',
      year: 'Year',
      noWorks: 'No works found matching your criteria.'
    },
    people: {
      family: 'Family',
      red: 'Red Team',
      blue: 'Blue Team',
      all: 'All Members',
      familyTree: 'Family Tree',
      stats: 'Stats',
    },
    upload: {
      title: 'Upload Data',
      member: 'Upload Member',
      media: 'Upload Media',
      work: 'Upload Work',
      match: 'Upload Match',
      chronicle: 'Upload Chronicle',
      submit: 'Submit',
      success: 'Upload successful',
      error: 'Upload failed',
    },
    planner: {
      title: 'Annual Planner',
      generate: 'Generate Plan',
      ask: 'Ask Qwen',
      placeholder: 'Enter your requirements...',
    },
    home: {
      title: 'DiYou FC',
      subtitle: 'Internal site (mobile-first / PWA)',
      welcome: 'Welcome, {name}',
      nav: {
        historyDesc: 'View historical events and photos',
        mediaDesc: 'Browse all photos and videos',
        worksDesc: 'Read articles and poems',
        peopleDesc: 'View member and family information',
        uploadDesc: 'Upload new content and media',
        plannerDesc: 'AI annual planner assistant',
      }
    },
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages,
})

