// 生成用于 UI 审查的样例数据（schema 与 研究生自我管理系统.html 一致）
function buildSeed() {
    const now = new Date();
    const dayKey = (d) =>
        d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const hhmm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

    const projects = [
        { id: 'proj-paper', name: '论文', color: '#2563eb' },
        { id: 'proj-exp', name: '实验/算例', color: '#7c3aed' },
        { id: 'proj-lit', name: '文献', color: '#0891b2' },
        { id: 'proj-course', name: '课程', color: '#059669' },
        { id: 'proj-ta', name: '助教', color: '#d97706' },
        { id: 'proj-misc', name: '杂务', color: '#6b7280' }
    ];
    const projIds = projects.map(p => p.id);
    const notes = [
        '整理实验网格划分，重跑收敛性测试',
        '读三篇 B&P 相关文献，摘录定价模型假设',
        '修改论文第 3 节，推导界并补图',
        '组会汇报 PPT 整理',
        '批改作业',
        '复现 baseline，跑通脚本'
    ];

    const workRecords = {};
    const intake = { coffee: { total: 0, totalCaffeine: 0, records: {} }, water: { total: 0, records: {} } };
    const toilet = { records: {} };
    const exercise = { records: {} };
    const tasks = {};

    for (let back = 13; back >= 0; back--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
        const key = dayKey(d);
        const workday = d.getDay() !== 0;
        const sessions = [];
        const rests = [];
        if (workday) {
            let cursor = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 10);
            const blocks = 4 + (back % 3);
            for (let i = 0; i < blocks; i++) {
                const dur = 40 + ((back * 13 + i * 29) % 80);
                const s = new Date(cursor);
                const e = new Date(s.getTime() + dur * 60000);
                sessions.push({
                    startTime: hhmm(s),
                    startTimestamp: s.getTime(),
                    endTime: hhmm(e),
                    endTimestamp: e.getTime(),
                    duration: dur,
                    projectId: projIds[(back + i) % projIds.length],
                    note: notes[(back + i * 2) % notes.length]
                });
                cursor = new Date(e.getTime() + 20 * 60000);
                const rd = 10 + ((back + i) % 3) * 5;
                const re = new Date(cursor.getTime() + rd * 60000);
                rests.push({
                    startTime: hhmm(cursor),
                    startTimestamp: cursor.getTime(),
                    endTime: hhmm(re),
                    endTimestamp: re.getTime(),
                    duration: rd
                });
                cursor = new Date(re.getTime() + 10 * 60000);
            }
        }
        workRecords[key] = { workSessions: sessions, restSessions: rests };

        const coffeeItems = [];
        const ncoffee = workday ? 1 + (back % 2) : 0;
        for (let i = 0; i < ncoffee; i++) {
            const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9 + i * 4, 30);
            coffeeItems.push({ id: back * 100 + i, time: hhmm(at), brand: '瑞幸', type: '美式', name: '瑞幸 美式', caffeine: 120, amount: 350 });
        }
        intake.coffee.records[key] = {
            count: coffeeItems.length,
            caffeine: coffeeItems.reduce((s, x) => s + x.caffeine, 0),
            items: coffeeItems
        };
        const waterItems = [];
        for (let i = 0; i < 6; i++) {
            const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9 + i, 0);
            waterItems.push({ id: back * 1000 + i, time: hhmm(at), amount: 250 });
        }
        intake.water.records[key] = { count: 6 * 250, items: waterItems };
        toilet.records[key] = { count: 4, times: ['08:20', '10:45', '14:10', '19:30'] };
        exercise.records[key] = workday ? [{ id: back, type: '跑步', startTime: '20:00', duration: 35, calories: 320 }] : [];
        tasks[key] = [
            { id: back * 100 + 1, text: '整理上周实验日志', createdAt: key + ' 09:00', dueDate: '', projectId: 'proj-exp' },
            { id: back * 100 + 2, text: '读文献并做笔记', createdAt: key + ' 10:00', dueDate: '', projectId: 'proj-lit' }
        ];
    }

    const today = dayKey(now);
    const inDays = (n) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
        return dayKey(d);
    };

    return {
        workData: { records: workRecords },
        intakeData: intake,
        toiletData: toilet,
        exerciseData: exercise,
        profileData: { name: '林一舟', id: 'G20233108', avatar: '', backgroundImage: '' },
        ballTypeOptions: ['篮球', '足球', '羽毛球', '网球', '乒乓球', '排球'],
        customExerciseTypes: ['跑步', '游泳'],
        taskData: tasks,
        todoData: {
            pending: [
                { id: 1, text: '重写论文第 4.2 节的理论部分', createdAt: today + ' 08:30', dueDate: inDays(2), projectId: 'proj-paper' },
                { id: 2, text: '给导师发一封进展汇报邮件', createdAt: today + ' 08:35', dueDate: inDays(1), projectId: 'proj-paper' },
                { id: 3, text: '整理 F9 实例的参数表', createdAt: today + ' 09:10', dueDate: '', projectId: 'proj-exp' },
                { id: 4, text: '读完 Lhommeaux 那两篇 pricing 综述', createdAt: today + ' 09:12', dueDate: inDays(5), projectId: 'proj-lit' },
                { id: 5, text: '准备周三组会 PPT', createdAt: today + ' 09:20', dueDate: inDays(3), projectId: 'proj-paper' },
                { id: 6, text: '把课程作业补交', createdAt: today + ' 09:25', dueDate: inDays(4), projectId: 'proj-course' }
            ],
            completed: [
                { id: 11, text: '回复审稿意见第 3 条', createdAt: today + ' 08:00', completedAt: today + ' 09:05', dueDate: '', projectId: 'proj-paper' },
                { id: 12, text: '跑通仿真脚本', createdAt: today + ' 08:02', completedAt: today + ' 08:50', dueDate: '', projectId: 'proj-exp' },
                { id: 13, text: '预约导师一对一', createdAt: today + ' 08:05', completedAt: today + ' 08:30', dueDate: '', projectId: 'proj-misc' }
            ]
        },
        coffeeData: {
            '瑞幸': { '美式': 120, '奶咖': 70, '手冲': 140 },
            '星巴克': { '美式': 150, '奶咖': 75, '手冲': 170 },
            'Manner': { '美式': 120, '奶咖': 70, '手冲': 140 }
        },
        moodData: {},
        workProjects: projects,
        currentProjectId: 'proj-paper',
        milestoneData: {
            items: [
                { id: 'ms-1', title: '完成论文初稿第三章', type: '论文', status: 'doing', blocker: '等导师意见', nextAction: '按导师批注改写 3.2 节', deadline: inDays(10), createdAt: '', updatedAt: '' },
                { id: 'ms-2', title: '跑完 F9 全部 36 个算例', type: '实验', status: 'doing', blocker: '等算力', nextAction: '提交集群排队任务', deadline: inDays(7), createdAt: '', updatedAt: '' },
                { id: 'ms-3', title: '文献综述框架定稿', type: '论文', status: 'plan', blocker: '无', nextAction: '列出三条主线', deadline: inDays(14), createdAt: '', updatedAt: '' },
                { id: 'ms-4', title: '开源代码打包发布', type: '实验', status: 'blocked', blocker: '自己没想清楚', nextAction: '决定 license 与目录结构', deadline: inDays(20), createdAt: '', updatedAt: '' },
                { id: 'ms-5', title: '组会汇报第 12 周', type: '其他', status: 'plan', blocker: '无', nextAction: '整理本周实验图', deadline: inDays(3), createdAt: '', updatedAt: '' },
                { id: 'ms-6', title: '复现 H4-BP baseline', type: '实验', status: 'done', blocker: '无', nextAction: '', deadline: inDays(-4), createdAt: '', updatedAt: '' },
                { id: 'ms-7', title: '课程读书报告', type: '课程', status: 'done', blocker: '无', nextAction: '', deadline: inDays(-8), createdAt: '', updatedAt: '' }
            ]
        },
        deadlineData: {
            items: [
                { id: 'dl-1', title: '投稿 TRB / Transportation Science', date: inDays(3) },
                { id: 'dl-2', title: '系里组会汇报', date: inDays(6) },
                { id: 'dl-3', title: '开题报告提交', date: inDays(21) },
                { id: 'dl-4', title: '课程作业提交', date: inDays(4) }
            ]
        },
        reminderData: {
            enabled: true,
            sound: true,
            water: { enabled: true, interval: 60, lastFired: 0, activeStart: '09:00', activeEnd: '22:00' },
            alarms: [
                { id: 'alarm-lunch', time: '11:30', label: '该去吃午饭了', repeat: 'daily', enabled: true, lastFired: '' },
                { id: 'alarm-offwork', time: '17:30', label: '准备收尾，今天已工作 {work}', repeat: 'weekday', enabled: true, lastFired: '' }
            ]
        },
        reflectionData: {
            [today]: {
                progress: '把定价问题的边界条件重新推了一遍，发现之前漏了时间窗约束。',
                stuck: '实验脚本在算例 17 上卡住，怀疑是初始解构造的问题。',
                tomorrow: '先定位算例 17 的报错，再重跑 F9 前 10 个实例。'
            }
        },
        caffeineSettings: { sleepTime: '23:30' }
    };
}

module.exports = { buildSeed };
