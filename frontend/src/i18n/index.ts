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
      passwordLogin: '密码登录',
      otpLogin: '邮箱验证码',
      verificationCode: '验证码',
      sendCode: '发送验证码',
      resendCode: '重新发送',
      sending: '发送中',
      codeSent: '验证码已发送',
      otpLoginFailed: '验证码登录失败',
      codeRequired: '请输入验证码',
      emailRequired: '请输入邮箱'
    },
    common: {
      loading: '加载中...',
      saving: '保存中...',
      save: '保存',
      cancel: '取消',
      clear: '清空',
      edit: '编辑',
      delete: '删除',
      close: '关闭',
      search: '搜索',
      searchPlaceholder: '搜索...',
      selectPlaceholder: '请选择...',
      selectOptionPlaceholder: '选择一个选项...',
      clearSelection: '清除选择',
      clearSearch: '清除搜索',
      noOptions: '无选项',
      noOptionsAvailable: '暂无可用选项',
      unknownDate: '未知日期',
      unknown: '未知',
      unnamed: '未命名',
      none: '无',
      parsing: '解析中...',
      importing: '导入中...',
      team: {
        none: '无',
        red: '红队',
        blue: '蓝队'
      },
      date: {
        yearSuffix: '年',
        monthSuffix: '月'
      }
    },
    app: {
      name: '棣友',
      brand: {
        name: 'DIYOU',
        established: 'est. 2013'
      },
      menu: {
        home: '主页',
        history: '历史',
        media: '照片/视频',
        works: '文集/诗集',
        people: '队员',
        upload: '上传资料',
        planner: '年会策划',
        aiAssistant: 'AI 助手'
      },
      admin: {
        accountManagement: '账号管理',
        knowledgeBase: '知识库'
      },
      langToggle: {
        en: 'EN',
        zh: '中'
      },
      empty: '暂无内容',
      all: '全部'
    },
    home: {
      kicker: 'DIYOU ARCHIVE • EST. 2013',
      title: '棣友足球队',
      subtitle: '内部网站（移动端优先 / 可安装为 PWA）',
      welcome: '欢迎, {name}',
      nav: {
        historyDesc: '查看历年大事记与照片',
        mediaDesc: '浏览所有照片和视频',
        worksDesc: '阅读文章与诗词',
        peopleDesc: '查看队员与家庭信息',
        uploadDesc: '上传新的内容资料',
        plannerDesc: 'AI 年会策划助手'
      }
    },
    people: {
      allFamilies: '所有家庭',
      allRed: '所有红队',
      allBlue: '所有蓝队',
      family: '家庭',
      red: '红队',
      blue: '蓝队',
      all: '全部队员',
      roster: 'ROSTER',
      familyTree: '家谱',
      stats: '数据',
      loading: '加载队员名单...',
      noMembers: '没有符合筛选条件的队员',
      captain: '队长',
      editMember: '编辑队员',
      form: {
        displayName: '显示名称 *',
        team: '队伍',
        family: '家庭',
        noFamily: '无家庭',
        newFamilyPlaceholder: '或输入新家庭名称...',
        createFamily: '+ 创建',
        captain: '队长',
        isCaptain: '设为队长'
      }
    },
    person: {
      changeAvatar: '修改头像',
      editProfile: '编辑资料',
      loadErrorDescription: '无法加载队员详情',
      notFoundTitle: '未找到该队员',
      notFoundDescription: '请求的队员不存在',
      noMedia: '暂无媒体记录',
      tabs: {
        chronicles: '大事记',
        matches: '比赛'
      },
      confirmDeleteMedia: '确认删除该媒体吗？此操作不可恢复。',
      confirmDeleteWork: '确认删除该作品吗？此操作不可恢复。',
      confirmDeleteMatch: '确认删除该比赛记录吗？此操作不可恢复。',
      confirmDeleteChronicle: '确认删除该大事记吗？此操作不可恢复。'
    },
    media: {
      alt: '媒体',
      archive: 'ARCHIVE',
      fallbackPhoto: '照片 {id}',
      fallbackVideo: '视频 {id}',
      type: {
        photo: '照片',
        video: '视频',
        photos: '照片',
        videos: '视频'
      },
      filters: {
        type: '类型',
        year: '年份',
        subject: '人物'
      },
      loading: '正在检索档案...',
      loadErrorDescription: '暂时无法加载媒体。',
      noRecords: '没有符合筛选条件的记录。',
      contribute: '贡献档案',
      timeLabel: '时间',
      yearLabel: '年份',
      membersLabel: '队员',
      lightboxHint: '✌️ 双指缩放，双击关闭',
      openDetailPage: '打开独立页面',
      editTitle: '编辑媒体',
      form: {
        takenAt: '拍摄时间',
        year: '年份',
        yearPlaceholder: 'YYYY',
        personTags: '人物标签',
        selectTags: '选择标签...'
      }
    },
    works: {
      articles: '文章',
      poems: '诗集',
      author: '作者',
      year: '年份',
      noWorks: '没有符合筛选条件的作品',
      noContent: '暂无内容。',
      authorLabel: '作者：',
      authorIdLabel: '作者 ID：',
      openDetailPage: '打开独立页面',
      editTitle: '编辑作品',
      form: {
        type: '类型 *',
        title: '标题 *',
        author: '作者',
        unknownAuthor: '未知/无',
        selectAuthor: '选择已有队员',
        orNewAuthor: '或输入新作者名',
        date: '日期 *',
        content: '正文 *',
        contentPlaceholder: '输入文章正文...'
      }
    },
    matches: {
      noRecords: '暂无比赛记录',
      team: {
        red: '红队',
        blue: '蓝队'
      },
      mvp: '⭐ MVP',
      mvpWithName: '⭐ MVP: {name}',
      record: '比赛记录',
      optionLabel: '{date} - 红队 {redScore}:{blueScore} 蓝队',
      editTitle: '编辑比赛',
      form: {
        playedAt: '比赛时间 *',
        redScore: '红队得分 *',
        blueScore: '蓝队得分 *',
        mvp: 'MVP',
        participants: '参赛队员',
        selectParticipants: '选择参赛队员...',
        notes: '备注'
      }
    },
    chronicles: {
      noRecords: '暂无大事记',
      coverAlt: '大事记封面',
      related: {
        media: '媒体',
        works: '作品',
        matches: '比赛'
      },
      editTitle: '编辑大事记',
      form: {
        title: '标题 *',
        happenedAt: '发生时间 *',
        description: '描述',
        descriptionPlaceholder: '输入纪事描述...',
        members: '关联队员',
        selectMembers: '选择队员...',
        photos: '关联照片',
        selectPhotos: '选择照片...',
        videos: '关联视频',
        selectVideos: '选择视频...',
        articles: '关联文章',
        selectArticles: '选择文章...',
        poems: '关联诗集',
        selectPoems: '选择诗集...',
        matches: '关联比赛',
        selectMatches: '选择比赛...'
      }
    },
    history: {
      kicker: 'THE TIMELINE',
      title: '历史时间线',
      futureButton: '+ 未来',
      yearKicker: '{name} TIMELINE',
      archiveCollection: 'ARCHIVE COLLECTION',
      loading: '正在检索档案...',
      section: {
        chronicles: '— 大事记',
        media: '— 媒体',
        works: '— 作品',
        matches: '— 比赛'
      },
      viewAll: '点击查看该年全部 >',
      noRecordsForYear: '{year} 年暂无记录。',
      contribute: '贡献档案',
      explore: 'EXPLORE'
    },
    planner: {
      kicker: 'AI ASSISTANT',
      title: '年会策划',
      subtitle: '与 AI 对话，制定完整的年会策划方案',
      greeting: '您好！我是年会策划 AI 助手。请告诉我参与人数、预算、日期和地点，我可以帮您生成完整的年会方案。',
      clearHistory: '清空对话记录',
      tabs: {
        plan: '策划案',
        budget: '预算表',
        prizes: '奖品清单',
        speech: '主持词',
        chat: '自由对话',
        form: '结构化表单'
      },
      role: {
        user: 'YOU',
        assistant: 'AI ASSISTANT'
      },
      saveToKnowledgeTooltip: '存入策划知识库',
      saveToKnowledge: '存入知识库',
      uploadDocumentTooltip: '上传参考文档至知识库',
      inputPlaceholder: '给 AI 助手发送消息...',
      send: '发送',
      savedChatTitle: '对话记录: {title}',
      saveSuccess: '已成功存入知识库！',
      saveError: '存入知识库失败: {msg}',
      requestError: '请求失败: {msg}',
      form: {
        peopleCount: '参与人数 *',
        budget: '总预算（元） *',
        date: '日期 *',
        duration: '时长（小时）',
        location: '地点/场地 *',
        locationPlaceholder: '例如：室内球场 / 酒店宴会厅',
        style: '风格',
        stylePlaceholder: '例如：温馨 / 热烈 / 正式 / 轻松',
        mustHave: '必须包含的环节',
        mustHavePlaceholder: '用逗号或换行分隔，例如：颁奖，抽奖，合影',
        avoid: '禁忌与避免事项',
        avoidPlaceholder: '用逗号或换行分隔',
        notes: '其他补充',
        requiredFields: '请填写参与人数、预算、日期和地点'
      },
      generating: '生成中...',
      generatePlan: '生成年会方案',
      generateError: '生成方案失败: {msg}',
      extractContentError: '无法提取文件内容',
      fileUploadSuccess: '✅ 成功将文档《{filename}》存入知识库，AI 后续可参考此文档。',
      fileUploadError: '❌ 上传文档失败: {msg}'
    },
    aiAssistant: {
      kicker: 'AI ASSISTANT',
      title: 'AI 助手',
      subtitle: '统一入口：自由问答、策划助手与知识库管理',
      tabs: {
        chat: '通用对话',
        planner: '策划助手',
        knowledge: '知识库管理'
      },
      openFullPlanner: '打开完整策划表单',
      knowledgeTitle: '知识库管理',
      knowledgeDesc: '管理员可在此管理策划知识文档、上传文件与生成方案。',
      openKnowledgeManager: '进入知识库管理'
    },
    knowledge: {
      kicker: 'KNOWLEDGE BASE',
      title: '策划知识库',
      subtitle: '管理与查看年会策划的知识资产（文件与对话）',
      searchPlaceholder: '搜索知识库标题或内容...',
      empty: '暂无策划知识',
      category: {
        all: '全部',
        files: '文档',
        chats: '对话'
      },
      type: {
        general: '通用',
        chat: '对话记录',
        file: '上传文件'
      },
      newChat: '新建对话',
      uploadDoc: '上传文档',
      generatePlan: '生成策划',
      chatLabel: 'AI 对话',
      chatWelcome: '开始提问，AI 会基于知识库内容为您解答。',
      chatInputPlaceholder: '输入问题，按回车发送...',
      send: '发送',
      chatError: '对话失败：{msg}',
      viewPlan: '查看生成方案',
      uploadTitle: '上传知识文档',
      uploadLabel: '点击或拖拽上传文档',
      uploadHint: '支持 .docx、.xlsx、.pdf、.txt',
      uploadSubmit: '上传并解析',
      uploadError: '上传文档失败',
      generateTitle: '生成活动策划',
      generateHint: '选择参考文档（可多选），可补充基础约束条件。',
      generateSubmit: '生成方案',
      generateError: '生成策划失败',
      backToForm: '返回选择',
      generatedPlan: '生成的活动策划'
    },
    upload: {
      kicker: 'DATA ENTRY',
      title: '上传资料',
      subtitle: '为集体档案贡献内容',
      success: '上传成功',
      error: '上传失败',
      submit: '上传',
      dropzoneLabel: '点击或拖拽文件到此处',
      fileTooLarge: '文件 {name} 超过大小限制',
      invalidFileType: '文件 {name} 格式不支持',
      uploadingProgress: '正在上传 {n}/{total}...',
      filesCount: '（{n} 个文件）',
      familyCreated: '家庭 "{label}" 已创建',
      tabs: {
        member: '队员',
        media: '媒体',
        work: '作品',
        match: '比赛',
        chronicle: '大事记'
      },
      member: {
        displayName: '显示名称 *',
        team: '队伍',
        family: '家庭',
        createFamily: '+ 创建家庭',
        newFamilyPlaceholder: '或输入新家庭名称...'
      },
      media: {
        files: '文件 *',
        help: '可选择多个文件...',
        takenAt: '拍摄时间（覆盖）',
        takenAtHelp: '留空则使用照片原始日期。',
        year: '年份（覆盖）',
        personTags: '人物标签',
        tagsHelp: '点击可选择多个'
      },
      work: {
        type: '类型 *',
        title: '标题 *',
        author: '作者',
        date: '日期（YYYY-MM-DD） *',
        content: '正文 *'
      },
      match: {
        playedAt: '比赛时间 *',
        redScore: '红队得分 *',
        blueScore: '蓝队得分 *',
        mvp: 'MVP',
        participants: '参赛队员',
        participantsHelp: '点击可选择多个'
      },
      chronicle: {
        title: '标题 *',
        happenedAt: '发生时间 *',
        description: '描述',
        media: '媒体（图片/视频）',
        collapseAdvanced: '收起高级关联',
        expandAdvanced: '展开高级关联（可选）',
        members: '关联队员',
        photos: '关联照片',
        videos: '关联视频',
        articles: '关联文章',
        poems: '关联诗集',
        matches: '关联比赛'
      },
      dailyMaterials: {
        title: '当日已存在资料（{date}）',
        description: '勾选下方卡片即可自动关联到本次大事记，无需再次上传。'
      },
      smartImport: {
        title: '智能导入',
        description: '支持微信公众号链接、网页链接、粘贴网页源码或上传文档自动提取正文',
        tabs: {
          url: '链接导入',
          html: '粘贴源码',
          file: '上传文件'
        },
        urlPlaceholder: 'https://mp.weixin.qq.com/s/... 或任意网页链接',
        parseUrl: '解析链接',
        urlHint: '微信公众号文章会自动识别标题、作者、发布时间和正文',
        htmlPlaceholder: '在此处粘贴网页 HTML 源码（右键网页 → 查看网页源代码 → 全选复制）',
        parseHtml: '解析源码',
        htmlHint: '当链接抓取失败时，粘贴源码是最稳定的方式',
        selectFile: '选择本地文件（PDF / Word / TXT）'
      }
    },
    admin: {
      kicker: 'ADMIN',
      title: '账号管理',
      subtitle: '管理所有登录用户及其关联的队员身份',
      addUser: '+ 添加用户',
      users: {
        email: '邮箱',
        phone: '手机号',
        role: '角色',
        linkedMember: '关联队员',
        unbound: '未绑定',
        actions: '操作',
        editUser: '编辑用户',
        newUser: '新增用户',
        linkMember: '绑定队员',
        noLink: '-- 不绑定 --',
        passwordPlaceholderEdit: '留空表示不修改',
        passwordPlaceholderNew: '必填',
        roles: {
          MEMBER: '普通用户',
          ADMIN: '管理员'
        }
      },
      batchImport: {
        title: '批量导入用户',
        description: '在下方表格中直接编辑，或上传 CSV / Excel 文件自动填充...',
        uploadFile: '上传表格文件',
        addRow: '+ 增加一行',
        columns: {
          email: '邮箱',
          password: '密码',
          role: '角色',
          memberName: '队员姓名',
          team: '队伍',
          familyName: '家庭'
        },
        noDataFound: '未能从文件中识别到有效数据，请检查表头是否包含“邮箱”等列。',
        parseFailed: '文件解析失败：',
        importFailed: '导入失败',
        validRows: '已识别 {n} 行有效数据',
        success: '导入成功',
        partialFailure: '导入完成，部分失败',
        stats: '总计 {total} 行｜成功 {created} 个账号｜新建 {createdMembers} 名队员｜新建 {createdFamilies} 个家庭',
        failureRow: '第 {row} 行（{email}）：{reason}',
        start: '开始导入',
        invalidPasswordsTitle: '存在密码不合规的行',
        invalidPasswordRow: '第 {row} 行（{email}）：密码需至少 8 位且包含大写、小写和数字；留空则由系统随机生成',
        generatedPasswordsTitle: '系统生成的临时密码',
        generatedPasswordsHint: '以下账号的密码为空，已由系统随机生成。请妥善保存并尽快通知对应用户修改密码。'
      }
    },
    editor: {
      linkText: '链接文字',
      imageAlt: '图片描述',
      boldText: '粗体文字',
      italicText: '斜体文字',
      strikeText: '删除线',
      placeholder: '在这里输入 Markdown 内容...\n支持标题、加粗、列表、链接、图片等',
      wordCountSuffix: '字',
      shortcutHint: 'Ctrl+B 粗体 · Ctrl+I 斜体 · Ctrl+K 链接 · Tab 缩进',
      toolbar: {
        heading1: '标题 1',
        heading2: '标题 2',
        heading3: '标题 3',
        bold: '粗体 (Ctrl+B)',
        italic: '斜体 (Ctrl+I)',
        strike: '删除线',
        quote: '引用 (Ctrl+Shift+9)',
        unorderedList: '无序列表 (Ctrl+Shift+8)',
        orderedList: '有序列表 (Ctrl+Shift+7)',
        code: '代码',
        link: '链接 (Ctrl+K)',
        image: '图片',
        horizontalRule: '分割线'
      },
      mode: {
        edit: '仅编辑',
        split: '分屏',
        preview: '预览'
      }
    },
    errors: {
      loadPersonFailed: '加载队员详情失败',
      deleteMediaFailed: '删除媒体失败',
      deleteWorkFailed: '删除作品失败',
      deleteMatchFailed: '删除比赛记录失败',
      deleteChronicleFailed: '删除大事记失败',
      uploadAvatarFailed: '上传头像失败',
      loadMediaFailed: '加载媒体失败',
      updateMediaFailed: '更新媒体失败',
      loadWorkFailed: '加载作品失败',
      updateWorkFailed: '更新作品失败',
      updateMatchFailed: '更新比赛失败',
      updateChronicleFailed: '更新大事记失败',
      loadYearDataFailed: '加载年份数据失败',
      loadDailyMaterialsFailed: '加载当日资料失败',
      displayNameRequired: '显示名称必填',
      workRequiredFields: '标题、日期和正文必填',
      playedAtRequired: '比赛时间必填',
      chronicleRequiredFields: '标题和日期必填',
      createFamilyFailed: '创建家庭失败',
      updateMemberFailed: '更新队员失败',
      saveUserFailed: '保存用户失败',
      deleteUserFailed: '删除用户失败',
      urlParseFailed: '链接解析失败，请尝试“粘贴源码”模式',
      htmlParseFailed: '源码解析失败',
      fileParseFailed: '文件解析失败，仅支持 PDF, Word 或纯文本',
      parseInputRequired: '必须提供文件、链接或源码其中一项',
      mediaFilesRequired: '请至少选择一个文件'
    },
    confirm: {
      deleteMedia: '确认删除该媒体吗？此操作不可恢复。',
      deleteWork: '确认删除该作品吗？此操作不可恢复。',
      deleteMatch: '确认删除该比赛记录吗？此操作不可恢复。',
      deleteChronicle: '确认删除该大事记吗？此操作不可恢复。',
      deleteUser: '确认删除此用户吗？',
      clearChatHistory: '确定要清空当前对话记录吗？'
    }
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
      passwordLogin: 'Password',
      otpLogin: 'Email Code',
      verificationCode: 'Verification Code',
      sendCode: 'Send Code',
      resendCode: 'Resend',
      sending: 'Sending',
      codeSent: 'Verification code sent',
      otpLoginFailed: 'Email code login failed',
      codeRequired: 'Please enter the verification code',
      emailRequired: 'Please enter your email'
    },
    common: {
      loading: 'Loading...',
      saving: 'Saving...',
      save: 'Save',
      cancel: 'Cancel',
      clear: 'Clear',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      search: 'Search',
      searchPlaceholder: 'Search...',
      selectPlaceholder: 'Select...',
      selectOptionPlaceholder: 'Select an option...',
      clearSelection: 'Clear selection',
      clearSearch: 'Clear search',
      noOptions: 'No options',
      noOptionsAvailable: 'No options available',
      unknownDate: 'Unknown Date',
      unknown: 'Unknown',
      unnamed: 'Unnamed',
      none: 'None',
      parsing: 'Parsing...',
      importing: 'Importing...',
      team: {
        none: 'None',
        red: 'Red Team',
        blue: 'Blue Team'
      },
      date: {
        yearSuffix: '',
        monthSuffix: ''
      }
    },
    app: {
      name: 'DiYou',
      brand: {
        name: 'DIYOU',
        established: 'est. 2013'
      },
      menu: {
        home: 'Home',
        history: 'History',
        media: 'Photos/Videos',
        works: 'Writings/Poems',
        people: 'Members',
        upload: 'Upload',
        planner: 'Annual Plan',
        aiAssistant: 'AI Assistant'
      },
      admin: {
        accountManagement: 'Account Management',
        knowledgeBase: 'Knowledge Base'
      },
      langToggle: {
        en: 'EN',
        zh: '中'
      },
      empty: 'No content yet',
      all: 'All'
    },
    home: {
      kicker: 'DIYOU ARCHIVE • EST. 2013',
      title: 'DiYou FC',
      subtitle: 'Internal site (mobile-first / PWA)',
      welcome: 'Welcome, {name}',
      nav: {
        historyDesc: 'View historical events and photos',
        mediaDesc: 'Browse all photos and videos',
        worksDesc: 'Read articles and poems',
        peopleDesc: 'View member and family information',
        uploadDesc: 'Upload new content and media',
        plannerDesc: 'AI annual planner assistant'
      }
    },
    people: {
      allFamilies: 'All Families',
      allRed: 'All Red',
      allBlue: 'All Blue',
      family: 'Family',
      red: 'Red Team',
      blue: 'Blue Team',
      all: 'All Members',
      roster: 'ROSTER',
      familyTree: 'Family Tree',
      stats: 'Stats',
      loading: 'Loading roster...',
      noMembers: 'No members found matching your criteria',
      captain: 'Captain',
      editMember: 'Edit Member',
      form: {
        displayName: 'Display Name *',
        team: 'Team',
        family: 'Family',
        noFamily: 'No Family',
        newFamilyPlaceholder: 'Or type a new family name...',
        createFamily: '+ Create',
        captain: 'Captain',
        isCaptain: 'Is captain'
      }
    },
    person: {
      changeAvatar: 'Change Avatar',
      editProfile: 'Edit Profile',
      loadErrorDescription: 'Unable to load person details',
      notFoundTitle: 'Person Not Found',
      notFoundDescription: 'The requested person could not be found',
      noMedia: 'No media records found',
      tabs: {
        chronicles: 'Chronicles',
        matches: 'Matches'
      },
      confirmDeleteMedia: 'Are you sure you want to delete this media? This action cannot be undone.',
      confirmDeleteWork: 'Are you sure you want to delete this work? This action cannot be undone.',
      confirmDeleteMatch: 'Are you sure you want to delete this match record? This action cannot be undone.',
      confirmDeleteChronicle: 'Are you sure you want to delete this chronicle? This action cannot be undone.'
    },
    media: {
      alt: 'Media',
      archive: 'ARCHIVE',
      fallbackPhoto: 'Photo {id}',
      fallbackVideo: 'Video {id}',
      type: {
        photo: 'Photo',
        video: 'Video',
        photos: 'Photos',
        videos: 'Videos'
      },
      filters: {
        type: 'TYPE',
        year: 'YEAR',
        subject: 'SUBJECT'
      },
      loading: 'Retrieving archives...',
      loadErrorDescription: 'Unable to load media at this time.',
      noRecords: 'No records found matching your criteria.',
      contribute: 'CONTRIBUTE TO ARCHIVE',
      timeLabel: 'Time',
      yearLabel: 'Year',
      membersLabel: 'Members',
      lightboxHint: '✌️ Pinch to zoom, double-tap to close',
      openDetailPage: 'Open detail page',
      editTitle: 'Edit Media',
      form: {
        takenAt: 'TAKEN AT',
        year: 'YEAR',
        yearPlaceholder: 'YYYY',
        personTags: 'SUBJECT TAGS',
        selectTags: 'Select tags...'
      }
    },
    works: {
      articles: 'Article',
      poems: 'Poem',
      author: 'Author',
      year: 'Year',
      noWorks: 'No works found matching your criteria',
      noContent: 'No content.',
      authorLabel: 'AUTHOR: ',
      authorIdLabel: 'AUTHOR ID: ',
      openDetailPage: 'Open detail page',
      editTitle: 'Edit Work',
      form: {
        type: 'TYPE *',
        title: 'TITLE *',
        author: 'AUTHOR',
        unknownAuthor: 'Unknown/None',
        selectAuthor: 'Select existing member',
        orNewAuthor: 'Or type a new author name',
        date: 'DATE *',
        content: 'CONTENT *',
        contentPlaceholder: 'Enter article content...'
      }
    },
    matches: {
      noRecords: 'No match records found',
      team: {
        red: 'RED',
        blue: 'BLUE'
      },
      mvp: '⭐ MVP',
      mvpWithName: '⭐ MVP: {name}',
      record: 'Match Record',
      optionLabel: '{date} - Red {redScore}:{blueScore} Blue',
      editTitle: 'Edit Match',
      form: {
        playedAt: 'PLAYED AT *',
        redScore: 'RED SCORE *',
        blueScore: 'BLUE SCORE *',
        mvp: 'MVP',
        participants: 'PARTICIPANTS',
        selectParticipants: 'Select participants...',
        notes: 'NOTES'
      }
    },
    chronicles: {
      noRecords: 'No chronicle events found',
      coverAlt: 'Chronicle Cover',
      related: {
        media: 'MEDIA',
        works: 'WORKS',
        matches: 'MATCHES'
      },
      editTitle: 'Edit Chronicle',
      form: {
        title: 'TITLE *',
        happenedAt: 'HAPPENED AT *',
        description: 'DESCRIPTION',
        descriptionPlaceholder: 'Enter chronicle description...',
        members: 'ASSOCIATED MEMBERS',
        selectMembers: 'Select members...',
        photos: 'ASSOCIATED PHOTOS',
        selectPhotos: 'Select photos...',
        videos: 'ASSOCIATED VIDEOS',
        selectVideos: 'Select videos...',
        articles: 'ASSOCIATED ARTICLES',
        selectArticles: 'Select articles...',
        poems: 'ASSOCIATED POEMS',
        selectPoems: 'Select poems...',
        matches: 'ASSOCIATED MATCHES',
        selectMatches: 'Select matches...'
      }
    },
    history: {
      kicker: 'THE TIMELINE',
      title: 'The Timeline',
      futureButton: '+ Future',
      yearKicker: '{name} TIMELINE',
      archiveCollection: 'ARCHIVE COLLECTION',
      loading: 'Retrieving archives...',
      section: {
        chronicles: '— CHRONICLES',
        media: '— MEDIA',
        works: '— WORKS',
        matches: '— MATCHES'
      },
      viewAll: 'View all for this year >',
      noRecordsForYear: 'No records found for {year}.',
      contribute: 'CONTRIBUTE TO ARCHIVE',
      explore: 'EXPLORE'
    },
    planner: {
      kicker: 'AI ASSISTANT',
      title: 'Annual Planner',
      subtitle: 'Chat with AI to formulate comprehensive event strategies',
      greeting: 'Hello! I am the annual event planning AI assistant. Tell me the number of attendees, budget, date, and location, and I can generate a complete annual event plan for you.',
      clearHistory: 'Clear chat history',
      tabs: {
        plan: 'Plan',
        budget: 'Budget',
        prizes: 'Prizes',
        speech: 'Speech',
        chat: 'Chat',
        form: 'Form'
      },
      role: {
        user: 'YOU',
        assistant: 'AI ASSISTANT'
      },
      saveToKnowledgeTooltip: 'Save to knowledge base',
      saveToKnowledge: 'Save to Knowledge',
      uploadDocumentTooltip: 'Upload reference document to knowledge base',
      inputPlaceholder: 'Message AI Assistant...',
      send: 'SEND',
      savedChatTitle: 'Chat Record: {title}',
      saveSuccess: 'Successfully saved to knowledge base!',
      saveError: 'Failed to save to knowledge base: {msg}',
      requestError: 'Request failed: {msg}',
      form: {
        peopleCount: 'Attendees *',
        budget: 'Total Budget (CNY) *',
        date: 'Date *',
        duration: 'Duration (hours)',
        location: 'Location/Venue *',
        locationPlaceholder: 'e.g. Indoor court / Hotel ballroom',
        style: 'Style',
        stylePlaceholder: 'e.g. Warm / Lively / Formal / Casual',
        mustHave: 'Must-have segments',
        mustHavePlaceholder: 'Separated by comma or line break, e.g. Awards, Lottery, Group photo',
        avoid: 'Avoid / Taboo items',
        avoidPlaceholder: 'Separated by comma or line break',
        notes: 'Additional notes',
        requiredFields: 'Please fill in attendees, budget, date, and location'
      },
      generating: 'Generating...',
      generatePlan: 'Generate Plan',
      generateError: 'Failed to generate plan: {msg}',
      extractContentError: 'Unable to extract file content',
      fileUploadSuccess: '✅ Successfully saved document "{filename}" to the knowledge base. The AI can now reference it.',
      fileUploadError: '❌ Failed to upload document: {msg}'
    },
    aiAssistant: {
      kicker: 'AI ASSISTANT',
      title: 'AI Assistant',
      subtitle: 'Unified entry: general chat, planning assistant and knowledge base management',
      tabs: {
        chat: 'General Chat',
        planner: 'Planner',
        knowledge: 'Knowledge Base'
      },
      openFullPlanner: 'Open Full Planner Form',
      knowledgeTitle: 'Knowledge Base Management',
      knowledgeDesc: 'Admins can manage planning knowledge documents, upload files and generate plans here.',
      openKnowledgeManager: 'Enter Knowledge Base'
    },
    knowledge: {
      kicker: 'KNOWLEDGE BASE',
      title: 'Knowledge Base',
      subtitle: 'Manage and view knowledge assets for annual event planning',
      searchPlaceholder: 'Search knowledge base title or content...',
      empty: 'No planning knowledge yet',
      category: {
        all: 'All',
        files: 'Documents',
        chats: 'Chats'
      },
      type: {
        general: 'General',
        chat: 'Chat Record',
        file: 'Uploaded File'
      },
      newChat: 'New Chat',
      uploadDoc: 'Upload Document',
      generatePlan: 'Generate Plan',
      chatLabel: 'AI Chat',
      chatWelcome: 'Ask a question and the AI will answer based on the knowledge base.',
      chatInputPlaceholder: 'Type a question and press Enter...',
      send: 'Send',
      chatError: 'Chat failed: {msg}',
      viewPlan: 'View Generated Plan',
      uploadTitle: 'Upload Knowledge Document',
      uploadLabel: 'Click or drag file here',
      uploadHint: 'Supports .docx, .xlsx, .pdf, .txt',
      uploadSubmit: 'Upload & Parse',
      uploadError: 'Failed to upload document',
      generateTitle: 'Generate Event Plan',
      generateHint: 'Select reference documents (multiple allowed) and optionally add constraints.',
      generateSubmit: 'Generate Plan',
      generateError: 'Failed to generate plan',
      backToForm: 'Back to Selection',
      generatedPlan: 'Generated Event Plan'
    },
    upload: {
      kicker: 'DATA ENTRY',
      title: 'Upload Data',
      subtitle: 'Contribute to the collective archive',
      success: 'Upload successful',
      error: 'Upload failed',
      submit: 'Submit',
      dropzoneLabel: 'Click or drag file here',
      fileTooLarge: 'File {name} exceeds size limit',
      invalidFileType: 'File {name} is not supported',
      uploadingProgress: 'Uploading {n} of {total}...',
      filesCount: '({n} files)',
      familyCreated: 'Family "{label}" created',
      tabs: {
        member: 'Member',
        media: 'Media',
        work: 'Work',
        match: 'Match',
        chronicle: 'Chronicle'
      },
      member: {
        displayName: 'DISPLAY NAME *',
        team: 'TEAM',
        family: 'FAMILY',
        createFamily: '+ Create Family',
        newFamilyPlaceholder: 'Or type a new family name...'
      },
      media: {
        files: 'FILES *',
        help: 'You can select multiple files...',
        takenAt: 'TAKEN AT (OVERRIDE)',
        takenAtHelp: 'Leave blank to use original photo dates.',
        year: 'YEAR (OVERRIDE)',
        personTags: 'SUBJECT TAGS',
        tagsHelp: 'Click to select multiple'
      },
      work: {
        type: 'TYPE *',
        title: 'TITLE *',
        author: 'AUTHOR',
        date: 'DATE (YYYY-MM-DD) *',
        content: 'CONTENT *'
      },
      match: {
        playedAt: 'PLAYED AT *',
        redScore: 'RED SCORE *',
        blueScore: 'BLUE SCORE *',
        mvp: 'MVP',
        participants: 'PARTICIPANTS',
        participantsHelp: 'Click to select multiple'
      },
      chronicle: {
        title: 'TITLE *',
        happenedAt: 'HAPPENED AT *',
        description: 'DESCRIPTION',
        media: 'MEDIA (IMAGE/VIDEO)',
        collapseAdvanced: 'Collapse advanced associations',
        expandAdvanced: 'Expand advanced associations (optional)',
        members: 'ASSOCIATED MEMBERS',
        photos: 'ASSOCIATED PHOTOS',
        videos: 'ASSOCIATED VIDEOS',
        articles: 'ASSOCIATED ARTICLES',
        poems: 'ASSOCIATED POEMS',
        matches: 'ASSOCIATED MATCHES'
      },
      dailyMaterials: {
        title: 'Existing materials for {date}',
        description: 'Check cards below to auto-associate with this chronicle without uploading again.'
      },
      smartImport: {
        title: 'Smart Import',
        description: 'Support WeChat article links, web links, pasted HTML source, or uploaded documents for automatic text extraction',
        tabs: {
          url: 'Link Import',
          html: 'Paste Source',
          file: 'Upload File'
        },
        urlPlaceholder: 'https://mp.weixin.qq.com/s/... or any web link',
        parseUrl: 'Parse Link',
        urlHint: 'WeChat articles will automatically extract title, author, publish time, and content',
        htmlPlaceholder: 'Paste webpage HTML source here (Right-click page → View page source → Select all → Copy)',
        parseHtml: 'Parse Source',
        htmlHint: 'When link parsing fails, pasting source is the most reliable way',
        selectFile: 'Select local file (PDF / Word / TXT)'
      }
    },
    admin: {
      kicker: 'ADMIN',
      title: 'Account Management',
      subtitle: 'Manage all login users and their linked member identities',
      addUser: '+ Add User',
      users: {
        email: 'Email',
        phone: 'Phone',
        role: 'Role',
        linkedMember: 'Linked Member',
        unbound: 'Unbound',
        actions: 'Actions',
        editUser: 'Edit User',
        newUser: 'New User',
        linkMember: 'Link Member',
        noLink: '-- No Link --',
        passwordPlaceholderEdit: 'Leave blank to keep unchanged',
        passwordPlaceholderNew: 'Required',
        roles: {
          MEMBER: 'Member',
          ADMIN: 'Admin'
        }
      },
      batchImport: {
        title: 'Batch Import Users',
        description: 'Edit directly in the table below, or upload a CSV / Excel file to auto-fill...',
        uploadFile: 'Upload Spreadsheet',
        addRow: '+ Add Row',
        columns: {
          email: 'Email',
          password: 'Password',
          role: 'Role',
          memberName: 'Member Name',
          team: 'Team',
          familyName: 'Family'
        },
        noDataFound: 'No valid data found in the file. Please check if the header contains "Email" etc.',
        parseFailed: 'File parsing failed: ',
        importFailed: 'Import failed',
        validRows: '{n} valid rows recognized',
        success: 'Import successful',
        partialFailure: 'Import completed with partial failures',
        stats: 'Total {total} rows | {created} accounts created | {createdMembers} members created | {createdFamilies} families created',
        failureRow: 'Row {row} ({email}): {reason}',
        start: 'Start Import',
        invalidPasswordsTitle: 'Rows with invalid passwords',
        invalidPasswordRow: 'Row {row} ({email}): password must be at least 8 characters with uppercase, lowercase and digits; leave empty to auto-generate',
        generatedPasswordsTitle: 'System-generated temporary passwords',
        generatedPasswordsHint: 'These accounts had empty passwords and have been assigned random passwords. Please save them securely and notify users to change their passwords soon.'
      }
    },
    editor: {
      linkText: 'Link text',
      imageAlt: 'Image description',
      boldText: 'Bold text',
      italicText: 'Italic text',
      strikeText: 'Strikethrough text',
      placeholder: 'Enter Markdown content here...\nSupports headings, bold, lists, links, images, etc.',
      wordCountSuffix: 'words',
      shortcutHint: 'Ctrl+B Bold · Ctrl+I Italic · Ctrl+K Link · Tab indent',
      toolbar: {
        heading1: 'Heading 1',
        heading2: 'Heading 2',
        heading3: 'Heading 3',
        bold: 'Bold (Ctrl+B)',
        italic: 'Italic (Ctrl+I)',
        strike: 'Strikethrough',
        quote: 'Quote (Ctrl+Shift+9)',
        unorderedList: 'Unordered List (Ctrl+Shift+8)',
        orderedList: 'Ordered List (Ctrl+Shift+7)',
        code: 'Code',
        link: 'Link (Ctrl+K)',
        image: 'Image',
        horizontalRule: 'Horizontal Rule'
      },
      mode: {
        edit: 'Edit Only',
        split: 'Split',
        preview: 'Preview'
      }
    },
    errors: {
      loadPersonFailed: 'Failed to load person details',
      deleteMediaFailed: 'Failed to delete media',
      deleteWorkFailed: 'Failed to delete work',
      deleteMatchFailed: 'Failed to delete match record',
      deleteChronicleFailed: 'Failed to delete chronicle',
      uploadAvatarFailed: 'Failed to upload avatar',
      loadMediaFailed: 'Failed to load media',
      updateMediaFailed: 'Failed to update media',
      loadWorkFailed: 'Failed to load work',
      updateWorkFailed: 'Failed to update work',
      updateMatchFailed: 'Failed to update match',
      updateChronicleFailed: 'Failed to update chronicle',
      loadYearDataFailed: 'Failed to load year data',
      loadDailyMaterialsFailed: 'Failed to load daily materials',
      displayNameRequired: 'Display name is required',
      workRequiredFields: 'Title, date and content are required',
      playedAtRequired: 'Played At is required',
      chronicleRequiredFields: 'Title and date are required',
      createFamilyFailed: 'Failed to create family',
      updateMemberFailed: 'Failed to update member',
      saveUserFailed: 'Error saving user',
      deleteUserFailed: 'Error deleting user',
      urlParseFailed: 'Link parsing failed, please try "Paste Source" mode',
      htmlParseFailed: 'Source parsing failed',
      fileParseFailed: 'File parsing failed, only PDF, Word or plain text is supported',
      parseInputRequired: 'Either file, url or html must be provided',
      mediaFilesRequired: 'Please select at least one file'
    },
    confirm: {
      deleteMedia: 'Are you sure you want to delete this media? This action cannot be undone.',
      deleteWork: 'Are you sure you want to delete this work? This action cannot be undone.',
      deleteMatch: 'Are you sure you want to delete this match record? This action cannot be undone.',
      deleteChronicle: 'Are you sure you want to delete this chronicle? This action cannot be undone.',
      deleteUser: 'Are you sure you want to delete this user?',
      clearChatHistory: 'Are you sure you want to clear the current chat history?'
    }
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages,
})
