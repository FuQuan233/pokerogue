# 389个招式中文机制描述核验

核验日期：2026-09-16。机制基线：`bf0fa4c33ac9d829414d4daed149ff7938503504`，本次仅修改中文描述，未修改战斗逻辑。

## 范围与口径

- 范围为 `src/data/fuquan-zh-fallbacks.json` 中全部389个招式效果条目，不代表游戏全部招式。每条均核对当前招式定义；复杂效果继续检查共用效果类、场地、天气、状态标签及伤害计算。
- 已注册且无“部分实现”标记340条；标记部分实现4条；标记未实现27条；仅存在于注释中、未注册18条。后两类合计45条，不能把原设定当成当前可用机制。
- 修改163条：118条修正机制表述或补充数值、目标及条件，45条标明当前没有可用实现；另外226条保留。修订数量不等于严重错误数量。
- 文案描述基础效果，概率为基础概率，回合数为基础持续时间；特性、道具、免疫、伤害取整与特殊战斗规则仍可能影响结果。必中指跳过通常命中/闪避判定，不代表穿透属性免疫、半无敌或所有保护。
- 月圆之夜和大黑天会临时替换部分招式及其预览，实际预览以 `weather-moves.ts` 为准。新月舞、新月祈祷的基础说明同时补充了天气分支。
- 本记录为逐条源码核验，并非389条逐个进行完整战斗模拟。相关自动化测试结果见文末。

## 需要特别注意的实现差异

| 招式 | 当前实现及处理 |
| --- | --- |
| 吵闹 | 单次攻击随机对手；没有连续3回合和阻止睡眠效果，已明确写出。 |
| 冰冻干燥 | 修改对水属性相性，没有附加冰冻效果。 |
| 多龙箭 | 对一个目标攻击2次，没有双打智能分配。 |
| 挑衅 | 在目标行动后递减，持续4次行动，不是固定3回合。 |
| 制裁光砾 | 根据阿尔宙斯/银伴战兽及其融合形态变属性，不直接检查多属性、AR系统或携带道具。 |
| 精神冲击、精神击破 | 属于特殊招式，用特攻对防御计算，不应写成物理伤害类别。 |
| 盐腌 | 通常每回合1/16最大HP，水或钢属性为1/8，按本项目数值描述。 |
| 沥青射击 | 火属性相性倍率乘2，并非一律变成弱点；已太晶化目标不能新增该标签。 |
| 克命爪 | 基础追加异常概率30%。 |
| 晶光星群 | 仍有部分实现标记；属性、群体目标和类别转换已核对，能力比较对所有特性影响的排除仍有代码TODO。 |

## 逐条记录

“原文＝现文”表示保留。证据列链接到当前定义，并列出附加效果类；这些类的定义位于同一文件，状态标签和伤害/命中计算见文末。

| 序号 | 招式 / 键 | 实现状态 / 处理 | 修改前 | 核验后的描述 | 定义及效果依据 |
| --- | --- | --- | --- | --- | --- |
| 1 | 啄（peck） | 已核验；保留 | 原文＝现文 | 用尖锐的喙或角刺向对手进行攻击 | [PECK](../src/data/moves/move.ts#L9638)；构造参数、目标与标记 |
| 2 | 双倍奉还（counter） | 已核验；修订 | 从对手那里受到物理攻击的伤害将以２倍返还给同一个对手 | 将本回合最后一次来自对手的物理招式伤害，以2倍返还给攻击者。 | [COUNTER](../src/data/moves/move.ts#L9645)；CounterDamageAttr、CounterRedirectAttr |
| 3 | 吸取（absorb） | 已核验；保留 | 原文＝现文 | 吸取对手的养分进行攻击。可以回复给予对手伤害的一半HP | [ABSORB](../src/data/moves/move.ts#L9653)；HitHealAttr |
| 4 | 超级吸取（megaDrain） | 已核验；保留 | 原文＝现文 | 吸取对手的养分进行攻击。可以回复给予对手伤害的一半HP | [MEGA_DRAIN](../src/data/moves/move.ts#L9656)；HitHealAttr |
| 5 | 催眠粉（sleepPowder） | 已核验；保留 | 原文＝现文 | 撒出催眠粉，从而让对手陷入睡眠状态 | [SLEEP_POWDER](../src/data/moves/move.ts#L9682)；StatusEffectAttr |
| 6 | 花瓣舞（petalDance） | 已核验；保留 | 原文＝现文 | 在２～３回合内，散落花瓣攻击对手。之后自己会陷入混乱 | [PETAL_DANCE](../src/data/moves/move.ts#L9686)；AddBattlerTagAttr |
| 7 | 吐丝（stringShot） | 已核验；修订 | 用口中吐出的丝缠绕对手，从而大幅降低对手的速度 | 用丝缠绕所有对手，使其速度降低2级。 | [STRING_SHOT](../src/data/moves/move.ts#L9691)；StatStageChangeAttr |
| 8 | 落石（rockThrow） | 已核验；保留 | 原文＝现文 | 拿起小岩石，投掷对手进行攻击 | [ROCK_THROW](../src/data/moves/move.ts#L9711)；构造参数、目标与标记 |
| 9 | 挖洞（dig） | 已核验；保留 | 原文＝现文 | 第１回合钻入地底，第２回合攻击对手 | [DIG](../src/data/moves/move.ts#L9725)；SemiInvulnerableAttr |
| 10 | 催眠术（hypnosis） | 已核验；保留 | 原文＝现文 | 施以诱导睡意的暗示，让对手陷入睡眠状态 | [HYPNOSIS](../src/data/moves/move.ts#L9736)；StatusEffectAttr |
| 11 | 瑜伽姿势（meditate） | 已核验；保留 | 原文＝现文 | 唤醒身体深处沉睡的力量，从而提高自己的攻击 | [MEDITATE](../src/data/moves/move.ts#L9739)；StatStageChangeAttr |
| 12 | 高速移动（agility） | 已核验；保留 | 原文＝现文 | 让身体放松变得轻盈，以便高速移动。大幅提高自己的速度 | [AGILITY](../src/data/moves/move.ts#L9741)；StatStageChangeAttr |
| 13 | 电光一闪（quickAttack） | 已核验；修订 | 以迅雷不及掩耳之势扑向对手。必定能够先制攻击 | 快速扑向目标攻击，招式优先度为+1。 | [QUICK_ATTACK](../src/data/moves/move.ts#L9743)；构造参数、目标与标记 |
| 14 | 瞬间移动（teleport） | 已核验；修订 | 后手行动，并与后备宝可梦交换。野生宝可梦使用时会逃走。 | 后手行动，与后备宝可梦交换；可逃离战斗的野生宝可梦使用时会逃走。 | [TELEPORT](../src/data/moves/move.ts#L9746)；ForceSwitchOutAttr |
| 15 | 模仿（mimic） | 已核验；修订 | 可以将对手最后使用的招式，在战斗内变成自己的招式 | 暂时将此招式替换为目标最后使用的招式，离场后恢复。 | [MIMIC](../src/data/moves/move.ts#L9752)；MovesetCopyMoveAttr |
| 16 | 影子分身（doubleTeam） | 已核验；保留 | 原文＝现文 | 通过快速移动来制造分身，扰乱对手，从而提高闪避率 | [DOUBLE_TEAM](../src/data/moves/move.ts#L9759)；StatStageChangeAttr |
| 17 | 自我再生（recover） | 已核验；保留 | 原文＝现文 | 让细胞再生，从而回复自己最大HP的一半 | [RECOVER](../src/data/moves/move.ts#L9761)；HealAttr |
| 18 | 变硬（harden） | 已核验；保留 | 原文＝现文 | 全身使劲，让身体变硬，从而提高自己的防御 | [HARDEN](../src/data/moves/move.ts#L9764)；StatStageChangeAttr |
| 19 | 奇异之光（confuseRay） | 已核验；保留 | 原文＝现文 | 显示奇怪的光，扰乱对手。使对手混乱 | [CONFUSE_RAY](../src/data/moves/move.ts#L9772)；ConfuseAttr |
| 20 | 缩入壳中（withdraw） | 已核验；保留 | 原文＝现文 | 缩入壳里保护身体，从而提高自己的防御 | [WITHDRAW](../src/data/moves/move.ts#L9775)；StatStageChangeAttr |
| 21 | 变圆（defenseCurl） | 已核验；保留 | 原文＝现文 | 蜷起身体，提高自己的防御。之后使用滚动或冰球时，威力翻倍。 | [DEFENSE_CURL](../src/data/moves/move.ts#L9777)；StatStageChangeAttr |
| 22 | 光墙（lightScreen） | 已核验；保留 | 原文＝现文 | 在5回合内使我方受到的特殊招式伤害减半。双打时改为减少三分之一。 | [LIGHT_SCREEN](../src/data/moves/move.ts#L9781)；AddArenaTagAttr |
| 23 | 反射壁（reflect） | 已核验；保留 | 原文＝现文 | 在5回合内使我方受到的物理招式伤害减半。双打时改为减少三分之一。 | [REFLECT](../src/data/moves/move.ts#L9787)；AddArenaTagAttr |
| 24 | 聚气（focusEnergy） | 已核验；保留 | 原文＝现文 | 集中精神，使自己的击中要害率提高2级。 | [FOCUS_ENERGY](../src/data/moves/move.ts#L9790)；AddBattlerTagAttr |
| 25 | 忍耐（bide） | 未实现；修订 | 在２回合内忍受攻击，受到的伤害会２倍返还给对手 | 当前版本尚无可用实现。原设定：在２回合内忍受攻击，受到的伤害会２倍返还给对手 | [BIDE](../src/data/moves/move.ts#L9794)；构造参数、目标与标记 |
| 26 | 鹦鹉学舌（mirrorMove） | 已核验；保留 | 原文＝现文 | 模仿对手使用的招式，自己也使用相同招式 | [MIRROR_MOVE](../src/data/moves/move.ts#L9799)；CopyMoveAttr |
| 27 | 尖刺加农炮（spikeCannon） | 已核验；保留 | 原文＝现文 | 向对手发射锐针进行攻击。连续攻击２～５次 | [SPIKE_CANNON](../src/data/moves/move.ts#L9829)；MultiHitAttr |
| 28 | 瞬间失忆（amnesia） | 已核验；保留 | 原文＝现文 | 将头脑清空，瞬间忘记某事，从而大幅提高自己的特防 | [AMNESIA](../src/data/moves/move.ts#L9834)；StatStageChangeAttr |
| 29 | 生蛋（softBoiled） | 已核验；保留 | 原文＝现文 | 回复自己最大HP的一半 | [SOFT_BOILED](../src/data/moves/move.ts#L9839)；HealAttr |
| 30 | 大蛇瞪眼（glare） | 已核验；保留 | 原文＝现文 | 用腹部的花纹使对手害怕，从而让其陷入麻痹状态 | [GLARE](../src/data/moves/move.ts#L9847)；StatusEffectAttr |
| 31 | 食梦（dreamEater） | 已核验；修订 | 吃掉正在睡觉的对手的梦进行攻击。回复对手所受到伤害的一半HP | 攻击睡眠或绝对睡眠状态的目标，回复所造成伤害一半的HP。 | [DREAM_EATER](../src/data/moves/move.ts#L9850)；HitHealAttr |
| 32 | 毒瓦斯（poisonGas） | 已核验；修订 | 将毒瓦斯吹到对手的脸上，从而让对手陷入中毒状态 | 使所有对手陷入中毒状态。 | [POISON_GAS](../src/data/moves/move.ts#L9854)；StatusEffectAttr |
| 33 | 投球（barrage） | 已核验；保留 | 原文＝现文 | 向对手投掷圆形物体进行攻击。连续攻击２～５次 | [BARRAGE](../src/data/moves/move.ts#L9858)；MultiHitAttr |
| 34 | 吸血（leechLife） | 已核验；保留 | 原文＝现文 | 吸取血液攻击对手。可以回复给予对手伤害的一半HP | [LEECH_LIFE](../src/data/moves/move.ts#L9862)；HitHealAttr |
| 35 | 恶魔之吻（lovelyKiss） | 已核验；保留 | 原文＝现文 | 用恐怖的脸强吻对手。让对手陷入睡眠状态 | [LOVELY_KISS](../src/data/moves/move.ts#L9865)；StatusEffectAttr |
| 36 | 溶化（acidArmor） | 已核验；保留 | 原文＝现文 | 通过细胞的变化进行液化，从而大幅提高自己的防御 | [ACID_ARMOR](../src/data/moves/move.ts#L9900)；StatStageChangeAttr |
| 37 | 蟹钳锤（crabhammer） | 已核验；保留 | 原文＝现文 | 用大钳子敲打对手进行攻击。容易击中要害 | [CRABHAMMER](../src/data/moves/move.ts#L9902)；HighCritAttr |
| 38 | 乱抓（furySwipes） | 已核验；保留 | 原文＝现文 | 用爪子或镰刀等抓对手进行攻击。连续攻击２～５次 | [FURY_SWIPES](../src/data/moves/move.ts#L9909)；MultiHitAttr |
| 39 | 骨头回力镖（bonemerang） | 已核验；保留 | 原文＝现文 | 用手中的骨头投掷对手，来回连续２次给予伤害 | [BONEMERANG](../src/data/moves/move.ts#L9911)；MultiHitAttr |
| 40 | 愤怒门牙（superFang） | 已核验；修订 | 用锋利的门牙猛烈地咬住对手进行攻击。对手的HP减半 | 造成相当于目标当前HP一半的伤害。 | [SUPER_FANG](../src/data/moves/move.ts#L9930)；TargetHalfHpDamageAttr |
| 41 | 劈开（slash） | 已核验；保留 | 原文＝现文 | 用爪子或镰刀等劈开对手进行攻击。容易击中要害 | [SLASH](../src/data/moves/move.ts#L9932)；HighCritAttr |
| 42 | 写生（sketch） | 已核验；保留 | 原文＝现文 | 将对手使用的招式变成自己的招式。使用１次后写生消失 | [SKETCH](../src/data/moves/move.ts#L9944)；SketchAttr |
| 43 | 蛛网（spiderWeb） | 已核验；保留 | 原文＝现文 | 将黏糊糊的细丝一层一层缠住对手，使其不能从战斗中逃走 | [SPIDER_WEB](../src/data/moves/move.ts#L9956)；AddBattlerTagAttr |
| 44 | 纹理２（conversion2） | 部分实现；修订 | 为了可以抵抗对手最后使用的招式，从而使自己的属性发生变化 | 按目标最后使用招式的原始属性，随机变为能抵抗或免疫它的另一属性；当前版本不考虑该招式临时改变的属性。 | [CONVERSION_2](../src/data/moves/move.ts#L9986)；ResistLastMoveTypeAttr |
| 45 | 气旋攻击（aeroblast） | 已核验；保留 | 原文＝现文 | 发射空气旋涡进行攻击。容易击中要害 | [AEROBLAST](../src/data/moves/move.ts#L9990)；HighCritAttr |
| 46 | 棉孢子（cottonSpore） | 已核验；修订 | 将棉花般柔软的孢子紧贴对手，从而大幅降低对手的速度 | 向所有对手撒出孢子，使其速度降低2级。 | [COTTON_SPORE](../src/data/moves/move.ts#L9993)；StatStageChangeAttr |
| 47 | 电磁炮（zapCannon） | 已核验；保留 | 原文＝现文 | 发射大炮一样的电流进行攻击。让对手陷入麻痹状态 | [ZAP_CANNON](../src/data/moves/move.ts#L10039)；StatusEffectAttr |
| 48 | 骨棒乱打（boneRush） | 已核验；保留 | 原文＝现文 | 用坚硬的骨头殴打对手进行攻击。连续攻击２～５次 | [BONE_RUSH](../src/data/moves/move.ts#L10071)；MultiHitAttr |
| 49 | 锁定（lockOn） | 已核验；保留 | 原文＝现文 | 紧紧瞄准对手，下次攻击必定会打中 | [LOCK_ON](../src/data/moves/move.ts#L10074)；AddBattlerTagAttr、MessageAttr |
| 50 | 逆鳞（outrage） | 已核验；保留 | 原文＝现文 | 在２～３回合内，乱打一气地进行攻击。大闹一番后自己会陷入混乱 | [OUTRAGE](../src/data/moves/move.ts#L10082)；AddBattlerTagAttr |
| 51 | 终极吸取（gigaDrain） | 已核验；保留 | 原文＝现文 | 吸取对手的养分进行攻击。可以回复给予对手伤害的一半HP | [GIGA_DRAIN](../src/data/moves/move.ts#L10088)；HitHealAttr |
| 52 | 虚张声势（swagger） | 已核验；保留 | 原文＝现文 | 激怒对手，使其混乱。因为愤怒，对手的攻击会大幅提高 | [SWAGGER](../src/data/moves/move.ts#L10102)；StatStageChangeAttr、ConfuseAttr |
| 53 | 喝牛奶（milkDrink） | 已核验；保留 | 原文＝现文 | 回复自己最大HP的一半 | [MILK_DRINK](../src/data/moves/move.ts#L10106)；HealAttr |
| 54 | 黑色目光（meanLook） | 已核验；保留 | 原文＝现文 | 用好似要勾人心魂的黑色目光一动不动地凝视对手，使其不能从战斗中逃走 | [MEAN_LOOK](../src/data/moves/move.ts#L10116)；AddBattlerTagAttr |
| 55 | 梦话（sleepTalk） | 已核验；修订 | 从自己已学会的招式中任意使出１个。只能在自己睡觉时使用 | 在睡眠或绝对睡眠状态下，随机使用一个可被梦话调用的已学招式。 | [SLEEP_TALK](../src/data/moves/move.ts#L10125)；BypassSleepAttr、RandomMovesetMoveAttr |
| 56 | 治愈铃声（healBell） | 已核验；修订 | 让同伴听舒适的铃音，从而治愈我方全员的异常状态 | 治愈我方全队的异常状态，但场上具有防音特性的同伴不受影响。 | [HEAL_BELL](../src/data/moves/move.ts#L10130)；PartyStatusCureAttr |
| 57 | 神秘守护（safeguard） | 已核验；保留 | 原文＝现文 | 在５回合内被神奇的力量守护，从而不会陷入异常状态 | [SAFEGUARD](../src/data/moves/move.ts#L10141)；AddArenaTagAttr |
| 58 | 爆裂拳（dynamicPunch） | 已核验；保留 | 原文＝现文 | 使出浑身力气出拳进行攻击。必定会使对手混乱 | [DYNAMIC_PUNCH](../src/data/moves/move.ts#L10160)；ConfuseAttr |
| 59 | 接棒（batonPass） | 已核验；保留 | 原文＝现文 | 与后备宝可梦交换，将自身的能力变化、替身等效果传递给上场的宝可梦。 | [BATON_PASS](../src/data/moves/move.ts#L10166)；ForceSwitchOutAttr |
| 60 | 再来一次（encore） | 已核验；修订 | 让对手接受再来一次，连续３次使出最后使用的招式 | 使目标在接下来3回合重复使用上次使用的招式。 | [ENCORE](../src/data/moves/move.ts#L10170)；AddBattlerTagAttr |
| 61 | 高速旋转（rapidSpin） | 已核验；保留 | 原文＝现文 | 旋转攻击并提高自己的速度，同时解除自身的束缚、寄生种子和我方场地上的入场陷阱。 | [RAPID_SPIN](../src/data/moves/move.ts#L10179)；StatStageChangeAttr、RemoveBattlerTagAttr、RemoveArenaTrapAttr |
| 62 | 甜甜香气（sweetScent） | 已核验；修订 | 用香气大幅降低对手的闪避率 | 使所有对手的闪避率降低2级。 | [SWEET_SCENT](../src/data/moves/move.ts#L10199)；StatStageChangeAttr |
| 63 | 十字劈（crossChop） | 已核验；保留 | 原文＝现文 | 用两手呈十字劈打对手进行攻击。容易击中要害 | [CROSS_CHOP](../src/data/moves/move.ts#L10220)；HighCritAttr |
| 64 | 镜面反射（mirrorCoat） | 已核验；修订 | 从对手那里受到特殊攻击的伤害将以２倍返还给同一个对手 | 将本回合最后一次来自对手的特殊招式伤害，以2倍返还给攻击者。 | [MIRROR_COAT](../src/data/moves/move.ts#L10236)；CounterDamageAttr、CounterRedirectAttr |
| 65 | 预知未来（futureSight） | 已核验；保留 | 原文＝现文 | 在使用招式２回合后，向对手发送一团念力进行攻击 | [FUTURE_SIGHT](../src/data/moves/move.ts#L10250)；DelayedAttackAttr |
| 66 | 击掌奇袭（fakeOut） | 已核验；保留 | 原文＝现文 | 进行先制攻击，使对手畏缩。要在出场后立刻使出才能成功 | [FAKE_OUT](../src/data/moves/move.ts#L10264)；FlinchAttr |
| 67 | 吵闹（uproar） | 部分实现；修订 | 在３回合内大吵大闹攻击对手。在此期间谁都不能入眠 | 用声音攻击随机一名对手。当前版本未实现连续3回合攻击和阻止睡眠的效果。 | [UPROAR](../src/data/moves/move.ts#L10267)；构造参数、目标与标记 |
| 68 | 蓄力（stockpile） | 已核验；保留 | 原文＝现文 | 积蓄力量，提高自己的防御和特防。最多积蓄３次 | [STOCKPILE](../src/data/moves/move.ts#L10273)；AddBattlerTagAttr |
| 69 | 吹捧（flatter） | 已核验；保留 | 原文＝现文 | 吹捧对手，使其混乱。同时还会提高对手的特攻 | [FLATTER](../src/data/moves/move.ts#L10300)；StatStageChangeAttr、ConfuseAttr |
| 70 | 临别礼物（memento） | 已核验；保留 | 原文＝现文 | 虽然会使自己陷入昏厥，但是能够大幅降低对手的攻击和特攻 | [MEMENTO](../src/data/moves/move.ts#L10307)；SacrificialAttrOnHit、StatStageChangeAttr |
| 71 | 真气拳（focusPunch） | 已核验；保留 | 原文＝现文 | 集中精神出拳。在招式使出前若受到攻击则会失败 | [FOCUS_PUNCH](../src/data/moves/move.ts#L10321)；MessageHeaderAttr、PreUseInterruptAttr |
| 72 | 看我嘛（followMe） | 已核验；修订 | 引起对手的注意，将对手的攻击全部转移到自己身上 | 本回合吸引对手的注意，将可被引导的单体招式转向自己。 | [FOLLOW_ME](../src/data/moves/move.ts#L10336)；AddBattlerTagAttr |
| 73 | 自然之力（naturePower） | 已核验；保留 | 原文＝现文 | 用自然之力进行攻击。根据所使用场所的不同，使出的招式也会有所变化 | [NATURE_POWER](../src/data/moves/move.ts#L10339)；NaturePowerAttr |
| 74 | 充电（charge） | 已核验；保留 | 原文＝现文 | 提高自己的特防，并使下次使用的电属性招式威力翻倍。 | [CHARGE](../src/data/moves/move.ts#L10341)；StatStageChangeAttr、AddBattlerTagAttr |
| 75 | 挑衅（taunt） | 已核验；修订 | 使对手愤怒。在３回合内让对手只能使出给予伤害的招式 | 使目标只能使用攻击招式。当前版本持续4次行动；若目标本回合尚未行动，该次也计入。 | [TAUNT](../src/data/moves/move.ts#L10344)；AddBattlerTagAttr |
| 76 | 戏法（trick） | 未实现；修订 | 抓住对手的空隙，交换自己和对手的持有物 | 当前版本尚无可用实现。原设定：抓住对手的空隙，交换自己和对手的持有物 | [TRICK](../src/data/moves/move.ts#L10355)；构造参数、目标与标记 |
| 77 | 祈愿（wish） | 已核验；保留 | 原文＝现文 | 下一回合结束时，回复自己或该位置替换上场宝可梦的HP，回复量为使用者最大HP的一半。 | [WISH](../src/data/moves/move.ts#L10362)；WishAttr |
| 78 | 扎根（ingrain） | 已核验；修订 | 在大地上扎根，每回合回复自己的HP。因为扎根了，所以不能替换宝可梦 | 扎根后，每回合结束回复自身最大HP的1/16，并使自身接地且不能替换。 | [INGRAIN](../src/data/moves/move.ts#L10367)；AddBattlerTagAttr |
| 79 | 蛮力（superpower） | 已核验；保留 | 原文＝现文 | 发挥惊人的力量攻击对手。自己的攻击和防御会降低 | [SUPERPOWER](../src/data/moves/move.ts#L10371)；StatStageChangeAttr |
| 80 | 魔法反射（magicCoat） | 已核验；保留 | 原文＝现文 | 当对手使出会变成异常状态的招式或寄生种子等时，会将对手的招式反射回去 | [MAGIC_COAT](../src/data/moves/move.ts#L10373)；AddBattlerTagAttr |
| 81 | 秘密之力（secretPower） | 已核验；修订 | 根据使用场所不同，该招式的追加效果也会有所变化 | 攻击目标，有30%的概率触发随场地或环境变化的追加效果。 | [SECRET_POWER](../src/data/moves/move.ts#L10434)；SecretPowerAttr |
| 82 | 潜水（dive） | 已核验；保留 | 原文＝现文 | 第１回合潜入水中，第２回合浮上来进行攻击 | [DIVE](../src/data/moves/move.ts#L10437)；SemiInvulnerableAttr、GulpMissileTagAttr |
| 83 | 猛推（armThrust） | 已核验；保留 | 原文＝现文 | 用张开着的双手猛推对手进行攻击。连续攻击２～５次 | [ARM_THRUST](../src/data/moves/move.ts#L10441)；MultiHitAttr |
| 84 | 保护色（camouflage） | 已核验；保留 | 原文＝现文 | 根据所在场所不同，如水边、草丛和洞窟等，可以改变自己的属性 | [CAMOUFLAGE](../src/data/moves/move.ts#L10443)；CopyBiomeTypeAttr |
| 85 | 萤火（tailGlow） | 已核验；保留 | 原文＝现文 | 凝视闪烁的光芒，集中自己的精神，从而巨幅提高特攻 | [TAIL_GLOW](../src/data/moves/move.ts#L10445)；StatStageChangeAttr |
| 86 | 摇晃舞（teeterDance） | 已核验；保留 | 原文＝现文 | 摇摇晃晃地跳起舞蹈，让自己周围的宝可梦陷入混乱状态 | [TEETER_DANCE](../src/data/moves/move.ts#L10456)；ConfuseAttr |
| 87 | 玩泥巴（mudSport） | 已核验；修订 | 一旦使用此招式，周围就会弄得到处是泥。在５回合内减弱电属性的招式 | 在5回合内使场上电属性招式的威力变为33%。 | [MUD_SPORT](../src/data/moves/move.ts#L10463)；AddArenaTagAttr |
| 88 | 偷懒（slackOff） | 已核验；保留 | 原文＝现文 | 偷懒休息。回复自己最大HP的一半 | [SLACK_OFF](../src/data/moves/move.ts#L10473)；HealAttr |
| 89 | 巨声（hyperVoice） | 已核验；修订 | 给予对手又吵又响的巨大震动进行攻击 | 用强烈的声音攻击所有对手。 | [HYPER_VOICE](../src/data/moves/move.ts#L10476)；构造参数、目标与标记 |
| 90 | 气象球（weatherBall） | 已核验；修订 | 根据使用时的天气，招式属性和威力会改变 | 有有效天气时威力翻倍；晴天或大日照变为火属性，雨天或大雨变为水属性，沙暴变为岩石属性，冰雹或雪天变为冰属性，其余为一般属性。 | [WEATHER_BALL](../src/data/moves/move.ts#L10494)；WeatherBallTypeAttr、MovePowerMultiplierAttr |
| 91 | 假哭（fakeTears） | 已核验；保留 | 原文＝现文 | 装哭流泪。使对手不知所措，从而大幅降低对手的特防 | [FAKE_TEARS](../src/data/moves/move.ts#L10504)；StatStageChangeAttr |
| 92 | 空气利刃（airCutter） | 已核验；修订 | 用锐利的风切斩对手进行攻击。容易击中要害 | 用锐利的风攻击所有对手，容易击中要害。 | [AIR_CUTTER](../src/data/moves/move.ts#L10507)；HighCritAttr |
| 93 | 过热（overheat） | 已核验；修订 | 使出全部力量攻击对手。使用之后会因为反作用力，自己的特攻大幅降低 | 全力攻击目标，自己的特攻降低2级。使用时可解除自身冰冻。 | [OVERHEAT](../src/data/moves/move.ts#L10512)；StatStageChangeAttr、HealStatusEffectAttr |
| 94 | 岩石封锁（rockTomb） | 已核验；保留 | 原文＝现文 | 投掷岩石进行攻击。封住对手的行动，从而降低速度 | [ROCK_TOMB](../src/data/moves/move.ts#L10519)；StatStageChangeAttr |
| 95 | 挠痒（tickle） | 已核验；保留 | 原文＝现文 | 给对手挠痒，使其发笑，从而降低对手的攻击和防御 | [TICKLE](../src/data/moves/move.ts#L10533)；StatStageChangeAttr |
| 96 | 宇宙力量（cosmicPower） | 已核验；保留 | 原文＝现文 | 汲取宇宙中神秘的力量，从而提高自己的防御和特防 | [COSMIC_POWER](../src/data/moves/move.ts#L10536)；StatStageChangeAttr |
| 97 | 流沙深渊（sandTomb） | 已核验；修订 | 将对手困在铺天盖地的沙暴中，在４～５回合内进行攻击 | 攻击并束缚目标4至5回合，每回合结束造成最大HP的1/8伤害；束缚期间不能通常替换或逃走。 | [SAND_TOMB](../src/data/moves/move.ts#L10550)；TrapAttr |
| 98 | 种子机关枪（bulletSeed） | 已核验；保留 | 原文＝现文 | 向对手猛烈地发射种子进行攻击。连续攻击２～５次 | [BULLET_SEED](../src/data/moves/move.ts#L10560)；MultiHitAttr |
| 99 | 冰锥（icicleSpear） | 已核验；保留 | 原文＝现文 | 向对手发射锋利的冰柱进行攻击。连续攻击２～５次 | [ICICLE_SPEAR](../src/data/moves/move.ts#L10566)；MultiHitAttr |
| 100 | 铁壁（ironDefense） | 已核验；保留 | 原文＝现文 | 将皮肤变得坚硬如铁，从而大幅提高自己的防御 | [IRON_DEFENSE](../src/data/moves/move.ts#L10569)；StatStageChangeAttr |
| 101 | 挡路（block） | 已核验；保留 | 原文＝现文 | 张开双手进行阻挡，封住对手的退路，使其不能逃走 | [BLOCK](../src/data/moves/move.ts#L10571)；AddBattlerTagAttr |
| 102 | 长嚎（howl） | 已核验；保留 | 原文＝现文 | 大声吼叫提高气势，从而提高自己和同伴的攻击 | [HOWL](../src/data/moves/move.ts#L10575)；StatStageChangeAttr |
| 103 | 龙爪（dragonClaw） | 已核验；保留 | 原文＝现文 | 用尖锐的巨爪劈开对手进行攻击 | [DRAGON_CLAW](../src/data/moves/move.ts#L10579)；构造参数、目标与标记 |
| 104 | 健美（bulkUp） | 已核验；保留 | 原文＝现文 | 使出全身力气绷紧肌肉，从而提高自己的攻击和防御 | [BULK_UP](../src/data/moves/move.ts#L10583)；StatStageChangeAttr |
| 105 | 玩水（waterSport） | 已核验；修订 | 用水湿透周围。在５回合内减弱火属性的招式 | 在5回合内使场上火属性招式的威力变为33%。 | [WATER_SPORT](../src/data/moves/move.ts#L10605)；AddArenaTagAttr |
| 106 | 冥想（calmMind） | 已核验；保留 | 原文＝现文 | 静心凝神，从而提高自己的特攻和特防 | [CALM_MIND](../src/data/moves/move.ts#L10609)；StatStageChangeAttr |
| 107 | 叶刃（leafBlade） | 已核验；保留 | 原文＝现文 | 像用剑一般操纵叶片切斩对手进行攻击。容易击中要害 | [LEAF_BLADE](../src/data/moves/move.ts#L10611)；HighCritAttr |
| 108 | 龙之舞（dragonDance） | 已核验；保留 | 原文＝现文 | 激烈地跳起神秘且强有力的舞蹈。从而提高自己的攻击和速度 | [DRAGON_DANCE](../src/data/moves/move.ts#L10614)；StatStageChangeAttr |
| 109 | 岩石爆击（rockBlast） | 已核验；保留 | 原文＝现文 | 向对手发射坚硬的岩石进行攻击。连续攻击２～５次 | [ROCK_BLAST](../src/data/moves/move.ts#L10617)；MultiHitAttr |
| 110 | 破灭之愿（doomDesire） | 已核验；保留 | 原文＝现文 | 使用招式２回合后，会用无数道光束攻击对手 | [DOOM_DESIRE](../src/data/moves/move.ts#L10625)；DelayedAttackAttr |
| 111 | 精神突进（psychoBoost） | 已核验；保留 | 原文＝现文 | 使出全部力量攻击对手。使用之后会因为反作用力，自己的特攻大幅降低 | [PSYCHO_BOOST](../src/data/moves/move.ts#L10630)；StatStageChangeAttr |
| 112 | 羽栖（roost） | 已核验；保留 | 原文＝现文 | 回复自己最大HP的一半。飞行属性的使用者会在本回合失去飞行属性。 | [ROOST](../src/data/moves/move.ts#L10632)；HealAttr、AddBattlerTagAttr |
| 113 | 重力（gravity） | 已核验；保留 | 原文＝现文 | 在5回合内提高招式命中率约67%，使飞行属性、飘浮等宝可梦落地。无法使用飞向空中的招式。 | [GRAVITY](../src/data/moves/move.ts#L10636)；AddArenaTagAttr |
| 114 | 臂锤（hammerArm） | 已核验；保留 | 原文＝现文 | 挥舞强力而沉重的拳头，给予对手伤害。自己的速度会降低 | [HAMMER_ARM](../src/data/moves/move.ts#L10649)；StatStageChangeAttr |
| 115 | 自然之恩（naturalGift） | 未实现；修订 | 从树果上获得力量进行攻击。根据携带的树果，招式属性和威力会改变 | 当前版本尚无可用实现。原设定：从树果上获得力量进行攻击。根据携带的树果，招式属性和威力会改变 | [NATURAL_GIFT](../src/data/moves/move.ts#L10661)；构造参数、目标与标记 |
| 116 | 佯攻（feint） | 已核验；保留 | 原文＝现文 | 能够攻击正在使用守住或看穿等招式的对手。解除其守护效果 | [FEINT](../src/data/moves/move.ts#L10669)；RemoveBattlerTagAttr、RemoveArenaTagsAttr |
| 117 | 啄食（pluck） | 已核验；保留 | 原文＝现文 | 用喙进行攻击。当对手携带树果时，可以食用并获得其效果 | [PLUCK](../src/data/moves/move.ts#L10678)；StealEatBerryAttr |
| 118 | 顺风（tailwind） | 已核验；保留 | 原文＝现文 | 在4回合内使自己及同伴的速度翻倍。 | [TAILWIND](../src/data/moves/move.ts#L10680)；AddArenaTagAttr |
| 119 | 近身战（closeCombat） | 已核验；保留 | 原文＝现文 | 放弃守护，向对手的怀里突击。自己的防御和特防会降低 | [CLOSE_COMBAT](../src/data/moves/move.ts#L10695)；StatStageChangeAttr |
| 120 | 以牙还牙（payback） | 已核验；修订 | 蓄力攻击。如果能在对手之后攻击，招式的威力会变成２倍 | 攻击目标；若目标本回合已经行动，威力翻倍，投球也计为行动。 | [PAYBACK](../src/data/moves/move.ts#L10697)；MovePowerMultiplierAttr |
| 121 | 恶意追击（assurance） | 已核验；保留 | 原文＝现文 | 如果此回合内对手已经受到伤害的话，招式威力会变成２倍 | [ASSURANCE](../src/data/moves/move.ts#L10705)；MovePowerMultiplierAttr |
| 122 | 查封（embargo） | 未实现；修订 | 让对手在５回合内不能使用宝可梦携带的道具。训练家也不能给那只宝可梦使用道具 | 当前版本尚无可用实现。原设定：让对手在５回合内不能使用宝可梦携带的道具。训练家也不能给那只宝可梦使用道具 | [EMBARGO](../src/data/moves/move.ts#L10707)；构造参数、目标与标记 |
| 123 | 投掷（fling） | 未实现；修订 | 快速投掷携带的道具进行攻击。根据道具不同，威力和效果会改变 | 当前版本尚无可用实现。原设定：快速投掷携带的道具进行攻击。根据道具不同，威力和效果会改变 | [FLING](../src/data/moves/move.ts#L10710)；构造参数、目标与标记 |
| 124 | 回复封锁（healBlock） | 已核验；修订 | 在５回合内无法通过招式、特性或携带的道具来回复HP | 使所有对手在5回合内无法通过招式、特性或携带道具回复HP。 | [HEAL_BLOCK](../src/data/moves/move.ts#L10720)；AddBattlerTagAttr |
| 125 | 幸运咒语（luckyChant） | 已核验；保留 | 原文＝现文 | 向天许愿，从而在５回合内不会被对手的攻击打中要害 | [LUCKY_CHANT](../src/data/moves/move.ts#L10732)；AddArenaTagAttr |
| 126 | 仿效（copycat） | 已核验；保留 | 原文＝现文 | 模仿场上最后使用的招式。尚未有招式使用，或该招式无法复制时失败。 | [COPYCAT](../src/data/moves/move.ts#L10739)；CopyMoveAttr |
| 127 | 毒菱（toxicSpikes） | 已核验；修订 | 在对手的脚下撒毒菱。使对手替换出场的宝可梦中毒 | 在对方场地布下毒菱，使之后接地出场的目标中毒；两层时变为剧毒。接地的毒属性宝可梦出场会清除毒菱。 | [TOXIC_SPIKES](../src/data/moves/move.ts#L10760)；AddArenaTrapTagAttr |
| 128 | 电磁飘浮（magnetRise） | 已核验；保留 | 原文＝现文 | 利用电气产生的磁力浮在空中。在５回合内可以飘浮 | [MAGNET_RISE](../src/data/moves/move.ts#L10769)；AddBattlerTagAttr |
| 129 | 波导弹（auraSphere） | 已核验；保留 | 原文＝现文 | 从体内产生出波导之力，然后向对手发出。攻击必定会命中 | [AURA_SPHERE](../src/data/moves/move.ts#L10780)；构造参数、目标与标记 |
| 130 | 岩石打磨（rockPolish） | 已核验；保留 | 原文＝现文 | 打磨自己的身体，减少空气阻力。可以大幅提高自己的速度 | [ROCK_POLISH](../src/data/moves/move.ts#L10783)；StatStageChangeAttr |
| 131 | 暗袭要害（nightSlash） | 已核验；保留 | 原文＝现文 | 抓住瞬间的空隙切斩对手。容易击中要害 | [NIGHT_SLASH](../src/data/moves/move.ts#L10790)；HighCritAttr |
| 132 | 种子炸弹（seedBomb） | 已核验；保留 | 原文＝现文 | 将外壳坚硬的大种子，从上方砸下攻击对手 | [SEED_BOMB](../src/data/moves/move.ts#L10794)；构造参数、目标与标记 |
| 133 | 十字剪（xScissor） | 已核验；保留 | 原文＝现文 | 将镰刀或爪子像剪刀般地交叉，顺势劈开对手 | [X_SCISSOR](../src/data/moves/move.ts#L10800)；构造参数、目标与标记 |
| 134 | 吸取拳（drainPunch） | 已核验；保留 | 原文＝现文 | 用拳头吸取对手的力量。可以回复给予对手伤害的一半HP | [DRAIN_PUNCH](../src/data/moves/move.ts#L10812)；HitHealAttr |
| 135 | 掉包（switcheroo） | 未实现；修订 | 用一闪而过的速度交换自己和对手的持有物 | 当前版本尚无可用实现。原设定：用一闪而过的速度交换自己和对手的持有物 | [SWITCHEROO](../src/data/moves/move.ts#L10828)；构造参数、目标与标记 |
| 136 | 诡计（nastyPlot） | 已核验；保留 | 原文＝现文 | 谋划诡计，激活头脑。大幅提高自己的特攻 | [NASTY_PLOT](../src/data/moves/move.ts#L10832)；StatStageChangeAttr |
| 137 | 雪崩（avalanche） | 已核验；修订 | 如果受到对手的招式攻击，就能给予该对手２倍威力的攻击 | 后手攻击；若本回合已经受到该目标的招式伤害，威力翻倍。 | [AVALANCHE](../src/data/moves/move.ts#L10836)；TurnDamagedDoublePowerAttr |
| 138 | 暗影爪（shadowClaw） | 已核验；保留 | 原文＝现文 | 以影子做成的锐爪，劈开对手。容易击中要害 | [SHADOW_CLAW](../src/data/moves/move.ts#L10840)；HighCritAttr |
| 139 | 精神利刃（psychoCut） | 已核验；保留 | 原文＝现文 | 用实体化的心之利刃劈开对手。容易击中要害 | [PSYCHO_CUT](../src/data/moves/move.ts#L10859)；HighCritAttr |
| 140 | 清除浓雾（defog） | 已核验；修订 | 降低目标的闪避率，并清除光墙、反射壁、极光幕、神秘守护等屏障，以及场上的入场陷阱、场地和浓雾。 | 降低目标闪避率1级，清除目标一侧的屏障，以及双方入场陷阱、场地和浓雾。 | [DEFOG](../src/data/moves/move.ts#L10871)；StatStageChangeAttr、ClearWeatherAttr、ClearTerrainAttr、RemoveScreensAttr、RemoveArenaTrapAttr、RemoveArenaTagsAttr |
| 141 | 戏法空间（trickRoom） | 已核验；保留 | 原文＝现文 | 后手制造奇异空间，使速度慢的宝可梦在5回合内先行动。 | [TRICK_ROOM](../src/data/moves/move.ts#L10881)；AddArenaTagAttr |
| 142 | 流星群（dracoMeteor） | 已核验；保留 | 原文＝现文 | 从天空中向对手落下陨石。使用之后因为反作用力，自己的特攻会大幅降低 | [DRACO_METEOR](../src/data/moves/move.ts#L10885)；StatStageChangeAttr |
| 143 | 飞叶风暴（leafStorm） | 已核验；保留 | 原文＝现文 | 用尖尖的叶片向对手卷起风暴。使用之后因为反作用力自己的特攻会大幅降低 | [LEAF_STORM](../src/data/moves/move.ts#L10893)；StatStageChangeAttr |
| 144 | 强力鞭打（powerWhip） | 已核验；保留 | 原文＝现文 | 激烈地挥舞青藤或触手摔打对手进行攻击 | [POWER_WHIP](../src/data/moves/move.ts#L10895)；构造参数、目标与标记 |
| 145 | 尖石攻击（stoneEdge） | 已核验；保留 | 原文＝现文 | 用尖尖的岩石刺入对手进行攻击。容易击中要害 | [STONE_EDGE](../src/data/moves/move.ts#L10912)；HighCritAttr |
| 146 | 喋喋不休（chatter） | 已核验；保留 | 原文＝现文 | 用非常烦人的，喋喋不休的音波攻击对手。使对手混乱 | [CHATTER](../src/data/moves/move.ts#L10927)；ConfuseAttr |
| 147 | 制裁光砾（judgment） | 已核验；修订 | 放出无数光弹攻击目标。使用者拥有多属性或AR系统特性时，招式属性随携带的石板或存储碟改变。 | 发射光弹攻击。阿尔宙斯、银伴战兽及包含它们的融合宝可梦使用时，属性随对应形态改变；其他使用者为一般属性。 | [JUDGMENT](../src/data/moves/move.ts#L10930)；FormChangeItemTypeAttr |
| 148 | 虫咬（bugBite） | 已核验；保留 | 原文＝现文 | 咬住进行攻击。当对手携带树果时，可以食用并获得其效果 | [BUG_BITE](../src/data/moves/move.ts#L10932)；StealEatBerryAttr |
| 149 | 水流喷射（aquaJet） | 已核验；修订 | 以迅雷不及掩耳之势扑向对手。必定能够先制攻击 | 快速扑向目标攻击，招式优先度为+1。 | [AQUA_JET](../src/data/moves/move.ts#L10939)；构造参数、目标与标记 |
| 150 | 攻击指令（attackOrder） | 已核验；保留 | 原文＝现文 | 召唤手下，让其朝对手发起攻击。容易击中要害 | [ATTACK_ORDER](../src/data/moves/move.ts#L10940)；HighCritAttr |
| 151 | 防御指令（defendOrder） | 已核验；保留 | 原文＝现文 | 召唤手下，让其附在自己的身体上。可以提高自己的防御和特防 | [DEFEND_ORDER](../src/data/moves/move.ts#L10943)；StatStageChangeAttr |
| 152 | 回复指令（healOrder） | 已核验；保留 | 原文＝现文 | 召唤手下疗伤。回复自己最大HP的一半 | [HEAL_ORDER](../src/data/moves/move.ts#L10945)；HealAttr |
| 153 | 二连击（doubleHit） | 已核验；保留 | 原文＝现文 | 使用尾巴等拍打对手进行攻击。连续２次给予伤害 | [DOUBLE_HIT](../src/data/moves/move.ts#L10951)；MultiHitAttr |
| 154 | 亚空裂斩（spacialRend） | 已核验；保留 | 原文＝现文 | 将对手连同周围的空间一起撕裂并给予伤害。容易击中要害 | [SPACIAL_REND](../src/data/moves/move.ts#L10955)；HighCritAttr |
| 155 | 新月舞（lunarDance） | 已核验；修订 | 使用者倒下，使之后替换上场的宝可梦恢复全部HP、PP并解除异常状态。 | 通常会使使用者倒下，让之后接替的宝可梦恢复全部HP、PP并解除异常状态。月圆之夜改为立即恢复全队（含倒下者）的HP、PP和异常状态，使用者不会倒下；大黑天下无效。 | [LUNAR_DANCE](../src/data/moves/move.ts#L10957)；SacrificialFullRestoreAttr |
| 156 | 熔岩风暴（magmaStorm） | 已核验；修订 | 将对手困在熊熊燃烧的火焰中，在４～５回合内进行攻击 | 攻击并束缚目标4至5回合，每回合结束造成最大HP的1/8伤害；束缚期间不能通常替换或逃走。 | [MAGMA_STORM](../src/data/moves/move.ts#L10964)；TrapAttr |
| 157 | 暗黑洞（darkVoid） | 已核验；修订 | 将对手强制拖入黑暗的世界，从而让对手陷入睡眠状态 | 使所有对手陷入睡眠状态。 | [DARK_VOID](../src/data/moves/move.ts#L10966)；StatusEffectAttr |
| 158 | 暗影潜袭（shadowForce） | 已核验；保留 | 原文＝现文 | 第１回合消失踪影，第２回合攻击对手。即使对手正受保护，也能击中 | [SHADOW_FORCE](../src/data/moves/move.ts#L10975)；SemiInvulnerableAttr |
| 159 | 广域防守（wideGuard） | 已核验；保留 | 原文＝现文 | 在１回合内防住击打我方全员的攻击 | [WIDE_GUARD](../src/data/moves/move.ts#L10981)；AddArenaTagAttr |
| 160 | 防守平分（guardSplit） | 已核验；修订 | 利用超能力将自己和对手的防御和特防相加，再进行平分 | 将自己和目标的防御、特防数值分别取平均，双方暂时使用平均值；不平分能力等级。 | [GUARD_SPLIT](../src/data/moves/move.ts#L10985)；AverageStatsAttr |
| 161 | 力量平分（powerSplit） | 已核验；修订 | 利用超能力将自己和对手的攻击和特攻相加，再进行平分 | 将自己和目标的攻击、特攻数值分别取平均，双方暂时使用平均值；不平分能力等级。 | [POWER_SPLIT](../src/data/moves/move.ts#L10989)；AverageStatsAttr |
| 162 | 奇妙空间（wonderRoom） | 未实现；修订 | 制造出离奇的空间。在５回合内互换所有宝可梦的防御和特防 | 当前版本尚无可用实现。原设定：制造出离奇的空间。在５回合内互换所有宝可梦的防御和特防 | [WONDER_ROOM](../src/data/moves/move.ts#L10993)；构造参数、目标与标记 |
| 163 | 精神冲击（psyshock） | 已核验；修订 | 将神奇的念波实体化攻击对手。给予物理伤害 | 以自己的特攻和目标的防御计算伤害，仍属于特殊招式。 | [PSYSHOCK](../src/data/moves/move.ts#L10997)；DefDefAttr |
| 164 | 毒液冲击（venoshock） | 已核验；保留 | 原文＝现文 | 将特殊的毒液泼向对手。对处于中毒状态的对手，威力会变成２倍 | [VENOSHOCK](../src/data/moves/move.ts#L10999)；MovePowerMultiplierAttr |
| 165 | 身体轻量化（autotomize） | 已核验；修订 | 削掉身体上没用的部分。大幅提高自己的速度，同时体重也会变轻 | 速度提高2级，体重减少100千克，最低降至0.1千克。 | [AUTOTOMIZE](../src/data/moves/move.ts#L11005)；StatStageChangeAttr、AddBattlerTagAttr |
| 166 | 愤怒粉（ragePowder） | 已核验；修订 | 将令人烦躁的粉末撒在自己身上，用以吸引对手的注意。使对手的攻击全部指向自己 | 本回合用粉末吸引对手，将可被引导的单体招式转向自己；不影响免疫粉末的攻击者。 | [RAGE_POWDER](../src/data/moves/move.ts#L11008)；AddBattlerTagAttr |
| 167 | 意念移物（telekinesis） | 已核验；保留 | 原文＝现文 | 使目标浮空3回合，期间免疫地面属性招式。除一击必杀招式外，对其使用的招式必定命中。 | [TELEKINESIS](../src/data/moves/move.ts#L11011)；AddBattlerTagAttr |
| 168 | 魔法空间（magicRoom） | 未实现；修订 | 制造出离奇的空间。在５回合内所有宝可梦携带道具的效果都会消失 | 当前版本尚无可用实现。原设定：制造出离奇的空间。在５回合内所有宝可梦携带道具的效果都会消失 | [MAGIC_ROOM](../src/data/moves/move.ts#L11029)；构造参数、目标与标记 |
| 169 | 山岚摔（stormThrow） | 已核验；保留 | 原文＝现文 | 向对手使出强烈的一击。攻击必定会击中要害 | [STORM_THROW](../src/data/moves/move.ts#L11037)；CritOnlyAttr |
| 170 | 烈焰溅射（flameBurst） | 已核验；保留 | 原文＝现文 | 以爆裂火焰攻击目标，并使目标身旁的宝可梦损失最大HP的十六分之一。 | [FLAME_BURST](../src/data/moves/move.ts#L11039)；FlameBurstAttr |
| 171 | 浸水（soak） | 已核验；保留 | 原文＝现文 | 将大量的水泼向对手，从而使其变成水属性 | [SOAK](../src/data/moves/move.ts#L11057)；ChangeTypeAttr |
| 172 | 蓄能焰袭（flameCharge） | 已核验；保留 | 原文＝现文 | 让火焰覆盖全身，攻击对手。积蓄力量来提高自己的速度 | [FLAME_CHARGE](../src/data/moves/move.ts#L11060)；StatStageChangeAttr |
| 173 | 盘蜷（coil） | 已核验；保留 | 原文＝现文 | 盘蜷着集中精神。提高自己的攻击、防御和命中率 | [COIL](../src/data/moves/move.ts#L11062)；StatStageChangeAttr |
| 174 | 酸液炸弹（acidSpray） | 已核验；保留 | 原文＝现文 | 喷出能溶化对手的液体进行攻击。会大幅降低对手的特防 | [ACID_SPRAY](../src/data/moves/move.ts#L11066)；StatStageChangeAttr |
| 175 | 欺诈（foulPlay） | 已核验；保留 | 原文＝现文 | 利用对手的力量进行攻击。正和自己战斗的对手，其攻击越高，伤害越大 | [FOUL_PLAY](../src/data/moves/move.ts#L11069)；TargetAtkUserAtkAttr |
| 176 | 单纯光束（simpleBeam） | 已核验；保留 | 原文＝现文 | 向对手发送谜之念波。接收到念波的对手，其特性会变为单纯 | [SIMPLE_BEAM](../src/data/moves/move.ts#L11071)；AbilityChangeAttr |
| 177 | 轮唱（round） | 已核验；修订 | 用歌声攻击对手。大家一起轮唱便可以接连使出，威力也会提高 | 用歌声攻击；同回合其他宝可梦的轮唱可紧接着使出，后续轮唱威力翻倍。 | [ROUND](../src/data/moves/move.ts#L11089)；CueNextRoundAttr、RoundPowerAttr |
| 178 | 逐步击破（chipAway） | 已核验；修订 | 看准机会稳步攻击。无视对手的能力变化，直接给予伤害 | 攻击目标，无视目标防御和闪避的能力等级变化。 | [CHIP_AWAY](../src/data/moves/move.ts#L11096)；IgnoreOpponentStatStagesAttr |
| 179 | 清除之烟（clearSmog） | 已核验；保留 | 原文＝现文 | 向对手投掷特殊的泥块进行攻击。使其能力变回原点 | [CLEAR_SMOG](../src/data/moves/move.ts#L11098)；ResetStatsAttr |
| 180 | 破壳（shellSmash） | 已核验；保留 | 原文＝现文 | 打破外壳，降低自己的防御和特防，但大幅提高攻击、特攻和速度 | [SHELL_SMASH](../src/data/moves/move.ts#L11113)；StatStageChangeAttr |
| 181 | 治愈波动（healPulse） | 已核验；修订 | 放出治愈波动，从而回复对手最大HP的一半 | 回复目标最大HP的一半，可对同伴使用。 | [HEAL_PULSE](../src/data/moves/move.ts#L11116)；HealAttr |
| 182 | 换档（shiftGear） | 已核验；保留 | 原文＝现文 | 转动齿轮，不仅提高自己的攻击，还会大幅提高速度 | [SHIFT_GEAR](../src/data/moves/move.ts#L11139)；StatStageChangeAttr |
| 183 | 巴投（circleThrow） | 已核验；修订 | 扔飞对手，强制拉后备宝可梦上场。如果对手为野生宝可梦，战斗将直接结束 | 后手攻击并强制目标换人；对可被驱逐的野生目标使其逃走，最后一个野生目标离场才结束战斗。 | [CIRCLE_THROW](../src/data/moves/move.ts#L11142)；ForceSwitchOutAttr |
| 184 | 镜面属性（reflectType） | 已核验；保留 | 原文＝现文 | 反射对手的属性，让自己也变成一样的属性 | [REFLECT_TYPE](../src/data/moves/move.ts#L11162)；CopyTypeAttr |
| 185 | 报仇（retaliate） | 已核验；修订 | 为倒下的同伴报仇。如果上一回合有同伴倒下，威力就会提高 | 攻击目标；若上一回合有同伴倒下，威力翻倍。 | [RETALIATE](../src/data/moves/move.ts#L11165)；MovePowerMultiplierAttr |
| 186 | 搏命（finalGambit） | 已核验；保留 | 原文＝现文 | 拼命攻击对手。虽然自己陷入昏厥，但会给予对手和自己目前HP等量的伤害 | [FINAL_GAMBIT](../src/data/moves/move.ts#L11175)；UserHpDamageAttr、SacrificialAttrOnHit |
| 187 | 传递礼物（bestow） | 未实现；修订 | 将自己携带的一件道具交给目标。 | 当前版本尚无可用实现。原设定：将自己携带的一件道具交给目标。 | [BESTOW](../src/data/moves/move.ts#L11178)；构造参数、目标与标记 |
| 188 | 虫之抵抗（struggleBug） | 已核验；修订 | 抵抗并攻击对手。会降低对手的特攻 | 攻击所有对手，使其特攻降低1级。 | [STRUGGLE_BUG](../src/data/moves/move.ts#L11210)；StatStageChangeAttr |
| 189 | 冰息（frostBreath） | 已核验；保留 | 原文＝现文 | 将冰冷的气息吹向对手进行攻击。必定会击中要害 | [FROST_BREATH](../src/data/moves/move.ts#L11220)；CritOnlyAttr |
| 190 | 龙尾（dragonTail） | 已核验；修订 | 弹飞对手，强制拉后备宝可梦上场。如果对手为野生宝可梦，战斗将直接结束 | 后手攻击并强制目标换人；对可被驱逐的野生目标使其逃走，最后一个野生目标离场才结束战斗。 | [DRAGON_TAIL](../src/data/moves/move.ts#L11222)；ForceSwitchOutAttr |
| 191 | 自我激励（workUp） | 已核验；保留 | 原文＝现文 | 激励自己，从而提高攻击和特攻 | [WORK_UP](../src/data/moves/move.ts#L11225)；StatStageChangeAttr |
| 192 | 电网（electroweb） | 已核验；修订 | 用电网捉住对手进行攻击。会降低对手的速度 | 攻击所有对手，使其速度降低1级。 | [ELECTROWEB](../src/data/moves/move.ts#L11227)；StatStageChangeAttr |
| 193 | 疯狂伏特（wildCharge） | 已核验；保留 | 原文＝现文 | 让电流覆盖全身撞向目标，自己受到相当于所造成伤害四分之一的反作用伤害。 | [WILD_CHARGE](../src/data/moves/move.ts#L11230)；RecoilAttr |
| 194 | 直冲钻（drillRun） | 已核验；保留 | 原文＝现文 | 像钢钻一样，一边旋转身体一边撞击对手。容易击中要害 | [DRILL_RUN](../src/data/moves/move.ts#L11233)；HighCritAttr |
| 195 | 木角（hornLeech） | 已核验；保留 | 原文＝现文 | 将角刺入，吸取对手的养分。可以回复给予对手伤害的一半HP | [HORN_LEECH](../src/data/moves/move.ts#L11239)；HitHealAttr |
| 196 | 圣剑（sacredSword） | 已核验；修订 | 用剑切斩对手进行攻击。无视对手的能力变化，直接给予伤害 | 攻击目标，无视目标防御和闪避的能力等级变化。 | [SACRED_SWORD](../src/data/moves/move.ts#L11242)；IgnoreOpponentStatStagesAttr |
| 197 | 棉花防守（cottonGuard） | 已核验；保留 | 原文＝现文 | 用软绵绵的绒毛包裹住自己的身体进行守护。巨幅提高自己的防御 | [COTTON_GUARD](../src/data/moves/move.ts#L11258)；StatStageChangeAttr |
| 198 | 精神击破（psystrike） | 已核验；修订 | 将神奇的念波实体化攻击对手。给予物理伤害 | 以自己的特攻和目标的防御计算伤害，仍属于特殊招式。 | [PSYSTRIKE](../src/data/moves/move.ts#L11262)；DefDefAttr |
| 199 | 扫尾拍打（tailSlap） | 已核验；保留 | 原文＝现文 | 用坚硬的尾巴拍打对手进行攻击。连续攻击２～５次 | [TAIL_SLAP](../src/data/moves/move.ts#L11264)；MultiHitAttr |
| 200 | 齿轮飞盘（gearGrind） | 已核验；保留 | 原文＝现文 | 向对手投掷钢铁齿轮进行攻击。连续２次给予伤害 | [GEAR_GRIND](../src/data/moves/move.ts#L11274)；MultiHitAttr |
| 201 | 高科技光炮（technoBlast） | 已核验；修订 | 向对手放出光弹。属性会根据自己携带的卡带不同而改变 | 发射光弹攻击。盖诺赛克特及包含它的融合宝可梦使用时，属性随对应卡带形态改变；其他使用者为一般属性。 | [TECHNO_BLAST](../src/data/moves/move.ts#L11280)；TechnoBlastTypeAttr |
| 202 | 冰封世界（glaciate） | 已核验；修订 | 将冰冻的冷气吹向对手进行攻击。会降低对手的速度 | 攻击所有对手，使其速度降低1级。 | [GLACIATE](../src/data/moves/move.ts#L11289)；StatStageChangeAttr |
| 203 | 大声咆哮（snarl） | 已核验；修订 | 没完没了地大声斥责，从而降低对手的特攻 | 用声音攻击所有对手，使其特攻降低1级。 | [SNARL](../src/data/moves/move.ts#L11306)；StatStageChangeAttr |
| 204 | Ｖ热焰（vCreate） | 已核验；保留 | 原文＝现文 | 从前额产生灼热的火焰，舍身撞击对手。防御、特防和速度会降低 | [V_CREATE](../src/data/moves/move.ts#L11313)；StatStageChangeAttr |
| 205 | 交错火焰（fusionFlare） | 已核验；修订 | 释放出巨大的火焰。受到巨大的闪电影响时，招式威力会提高 | 释放火焰攻击；本回合紧接成功使用的交错闪电后使用时，威力翻倍。可解除自身冰冻。 | [FUSION_FLARE](../src/data/moves/move.ts#L11315)；HealStatusEffectAttr、LastMoveDoublePowerAttr |
| 206 | 交错闪电（fusionBolt） | 已核验；修订 | 释放出巨大的闪电。受到巨大的火焰影响时，招式威力会提高 | 释放闪电攻击；本回合紧接成功使用的交错火焰后使用时，威力翻倍。 | [FUSION_BOLT](../src/data/moves/move.ts#L11318)；LastMoveDoublePowerAttr |
| 207 | 耕地（rototiller） | 已核验；修订 | 翻耕土地，使草木更容易成长。会提高草属性宝可梦的攻击和特攻 | 使场上接地的草属性宝可梦（含对手）的攻击和特攻各提高1级。 | [ROTOTILLER](../src/data/moves/move.ts#L11333)；StatStageChangeAttr |
| 208 | 致命针刺（fellStinger） | 已核验；保留 | 原文＝现文 | 如果使用此招式打倒对手，攻击会巨幅提高 | [FELL_STINGER](../src/data/moves/move.ts#L11348)；PostVictoryStatStageChangeAttr |
| 209 | 潜灵奇袭（phantomForce） | 已核验；保留 | 原文＝现文 | 第１回合消失在某处，第２回合攻击对手。可以无视守护进行攻击 | [PHANTOM_FORCE](../src/data/moves/move.ts#L11350)；SemiInvulnerableAttr |
| 210 | 万圣夜（trickOrTreat） | 已核验；保留 | 原文＝现文 | 邀请对手参加万圣夜。使对手被追加幽灵属性 | [TRICK_OR_TREAT](../src/data/moves/move.ts#L11354)；AddTypeAttr |
| 211 | 战吼（nobleRoar） | 已核验；保留 | 原文＝现文 | 发出战吼威吓对手，从而降低对手的攻击和特攻 | [NOBLE_ROAR](../src/data/moves/move.ts#L11357)；StatStageChangeAttr |
| 212 | 抛物面充电（parabolicCharge） | 已核验；保留 | 原文＝现文 | 给周围全体宝可梦造成伤害。可以回复给予伤害的一半HP | [PARABOLIC_CHARGE](../src/data/moves/move.ts#L11364)；HitHealAttr |
| 213 | 森林咒术（forestsCurse） | 已核验；保留 | 原文＝现文 | 向对手施加森林咒术。中了咒术的对手会被追加草属性 | [FORESTS_CURSE](../src/data/moves/move.ts#L11368)；AddTypeAttr |
| 214 | 落英缤纷（petalBlizzard） | 已核验；保留 | 原文＝现文 | 猛烈地刮起飞雪般的落花，攻击周围所有的宝可梦，并给予伤害 | [PETAL_BLIZZARD](../src/data/moves/move.ts#L11371)；构造参数、目标与标记 |
| 215 | 冷冻干燥（freezeDry） | 已核验；修订 | 急剧冷冻对手，有时会让对手陷入冰冻状态。对于水属性宝可梦也是效果绝佳 | 以冷气攻击，对水属性的相性按效果绝佳计算。当前版本不附带冰冻效果。 | [FREEZE_DRY](../src/data/moves/move.ts#L11375)；FreezeDryAttr |
| 216 | 抛下狠话（partingShot） | 已核验；保留 | 原文＝现文 | 抛下狠话威吓对手，降低攻击和特攻后，和后备宝可梦进行替换 | [PARTING_SHOT](../src/data/moves/move.ts#L11380)；PartingShotAttr |
| 217 | 鲜花防守（flowerShield） | 已核验；保留 | 原文＝现文 | 使用神奇的力量提高在场的所有草属性宝可梦的防御 | [FLOWER_SHIELD](../src/data/moves/move.ts#L11395)；StatStageChangeAttr |
| 218 | 薄雾场地（mistyTerrain） | 已核验；修订 | 在５回合内，地面上的宝可梦不会陷入异常状态。龙属性招式的伤害也会减半 | 形成薄雾场地5回合。接地的宝可梦免疫异常状态和混乱，受到的龙属性招式威力减半。 | [MISTY_TERRAIN](../src/data/moves/move.ts#L11414)；TerrainChangeAttr |
| 219 | 输电（electrify） | 已核验；保留 | 原文＝现文 | 对手使出招式前，如果输电，则该回合对手的招式变成电属性 | [ELECTRIFY](../src/data/moves/move.ts#L11417)；AddBattlerTagAttr |
| 220 | 妖精之风（fairyWind） | 已核验；保留 | 原文＝现文 | 刮起妖精之风，吹向对手进行攻击 | [FAIRY_WIND](../src/data/moves/move.ts#L11421)；构造参数、目标与标记 |
| 221 | 爆音波（boomburst） | 已核验；保留 | 原文＝现文 | 通过震耳欲聋的爆炸声产生的破坏力，攻击自己周围所有的宝可梦 | [BOOMBURST](../src/data/moves/move.ts#L11425)；构造参数、目标与标记 |
| 222 | 妖精之锁（fairyLock） | 已核验；保留 | 原文＝现文 | 通过封锁，下一回合所有的宝可梦都无法逃走 | [FAIRY_LOCK](../src/data/moves/move.ts#L11428)；AddArenaTagAttr |
| 223 | 魔法火焰（mysticalFire） | 已核验；保留 | 原文＝现文 | 从口中喷出特别灼热的火焰进行攻击。降低对手的特攻 | [MYSTICAL_FIRE](../src/data/moves/move.ts#L11462)；StatStageChangeAttr |
| 224 | 芳香薄雾（aromaticMist） | 已核验；保留 | 原文＝现文 | 通过神奇的芳香，提高我方宝可梦的特防 | [AROMATIC_MIST](../src/data/moves/move.ts#L11467)；StatStageChangeAttr |
| 225 | 大地掌控（geomancy） | 已核验；保留 | 原文＝现文 | 第１回合吸收能量，第２回合大幅提高特攻、特防和速度 | [GEOMANCY](../src/data/moves/move.ts#L11487)；StatStageChangeAttr |
| 226 | 磁场操控（magneticFlux） | 已核验；修订 | 通过操控磁场，会提高特性为正电和负电的宝可梦的防御和特防 | 使自己和场上同伴中具有正电或负电特性的宝可梦，防御和特防各提高1级。 | [MAGNETIC_FLUX](../src/data/moves/move.ts#L11490)；StatStageChangeAttr |
| 227 | 电气场地（electricTerrain） | 已核验；修订 | 在５回合内变成电气场地。地面上的宝可梦将无法入眠。电属性的招式威力还会提高 | 形成电气场地5回合。接地的宝可梦无法入眠，使用电属性招式时威力提高30%。 | [ELECTRIC_TERRAIN](../src/data/moves/move.ts#L11505)；TerrainChangeAttr |
| 228 | 蹭蹭脸颊（nuzzle） | 已核验；保留 | 原文＝现文 | 将带电的脸颊蹭蹭对手进行攻击。让对手陷入麻痹状态 | [NUZZLE](../src/data/moves/move.ts#L11520)；StatusEffectAttr |
| 229 | 纠缠不休（infestation） | 已核验；修订 | 在４～５回合内死缠烂打地进行攻击。在此期间对手将无法逃走 | 攻击并束缚目标4至5回合，每回合结束造成最大HP的1/8伤害；束缚期间不能通常替换或逃走。 | [INFESTATION](../src/data/moves/move.ts#L11524)；TrapAttr |
| 230 | 增强拳（powerUpPunch） | 已核验；保留 | 原文＝现文 | 通过反复击打对手，使自己的拳头慢慢变硬。打中对手攻击就会提高 | [POWER_UP_PUNCH](../src/data/moves/move.ts#L11527)；StatStageChangeAttr |
| 231 | 千箭齐发（thousandArrows） | 已核验；修订 | 可以击中浮在空中的宝可梦。空中的对手被击落后，会掉到地面 | 攻击所有对手，也能击中浮空目标，并使其落地。 | [THOUSAND_ARROWS](../src/data/moves/move.ts#L11533)；NeutralDamageAgainstFlyingTypeAttr、FallDownAttr、HitsTagAttr |
| 232 | 千波激荡（thousandWaves） | 已核验；修订 | 从地面掀起波浪进行攻击。被掀入波浪中的对手，将无法从战斗中逃走 | 攻击所有对手，并使被困住的目标无法通常替换或逃走。 | [THOUSAND_WAVES](../src/data/moves/move.ts#L11539)；AddBattlerTagAttr |
| 233 | 大地神力（landsWrath） | 已核验；修订 | 聚集大地的力量，将此力量集中攻击对手，并给予伤害 | 聚集大地力量攻击所有对手。 | [LANDS_WRATH](../src/data/moves/move.ts#L11543)；构造参数、目标与标记 |
| 234 | 破灭之光（lightOfRuin） | 已核验；修订 | 借用永恒之花的力量，发射出强力光线。自己也会受到非常大的伤害 | 发射光线攻击，自己承受相当于所造成伤害一半的反作用伤害。 | [LIGHT_OF_RUIN](../src/data/moves/move.ts#L11546)；RecoilAttr |
| 235 | 画龙点睛（dragonAscent） | 已核验；保留 | 原文＝现文 | 从天空中急速下降攻击对手。自己的防御和特防会降低 | [DRAGON_ASCENT](../src/data/moves/move.ts#L11555)；StatStageChangeAttr |
| 236 | 异次元猛攻（hyperspaceFury） | 已核验；修订 | 用许多手臂，无视对手的守住或看穿等招式进行连续攻击，自己的防御会降低 | 攻击目标，无视守住、看穿和替身，且不进行命中率判定。自己的防御降低1级。 | [HYPERSPACE_FURY](../src/data/moves/move.ts#L11557)；StatStageChangeAttr |
| 237 | 集沙（shoreUp） | 已核验；保留 | 原文＝现文 | 回复自己最大HP的一半；沙暴中改为回复三分之二。 | [SHORE_UP](../src/data/moves/move.ts#L11640)；VariableHealAttr |
| 238 | 缝影（spiritShackle） | 已核验；保留 | 原文＝现文 | 攻击的同时，缝住对手的影子，使其无法逃走 | [SPIRIT_SHACKLE](../src/data/moves/move.ts#L11648)；AddBattlerTagAttr |
| 239 | ＤＤ金勾臂（darkestLariat） | 已核验；修订 | 旋转双臂打向对手。无视对手的能力变化，直接给予伤害 | 攻击目标，无视目标防御和闪避的能力等级变化。 | [DARKEST_LARIAT](../src/data/moves/move.ts#L11651)；IgnoreOpponentStatStagesAttr |
| 240 | 泡影的咏叹调（sparklingAria） | 已核验；修订 | 随着唱歌会放出很多气球。受到此招式攻击时，灼伤会被治愈 | 用声音攻击周围所有其他宝可梦（包括同伴），解除命中目标的灼伤。 | [SPARKLING_ARIA](../src/data/moves/move.ts#L11653)；HealStatusEffectAttr |
| 241 | 冰锤（iceHammer） | 已核验；保留 | 原文＝现文 | 挥舞强力而沉重的拳头，给予对手伤害。自己的速度会降低 | [ICE_HAMMER](../src/data/moves/move.ts#L11657)；StatStageChangeAttr |
| 242 | 花疗（floralHealing） | 已核验；保留 | 原文＝现文 | 回复目标最大HP的一半；青草场地中改为回复三分之二。 | [FLORAL_HEALING](../src/data/moves/move.ts#L11660)；VariableHealAttr |
| 243 | 吸取力量（strengthSap） | 已核验；修订 | 给自己回复和对手攻击力相同数值的HP，然后降低对手的攻击 | 回复等同于目标当前攻击数值的HP，再使目标攻击降低1级；目标攻击已降至最低时失败。 | [STRENGTH_SAP](../src/data/moves/move.ts#L11665)；HitHealAttr、StatStageChangeAttr |
| 244 | 毒丝（toxicThread） | 已核验；保留 | 原文＝现文 | 使目标中毒，并大幅降低其速度。 | [TOXIC_THREAD](../src/data/moves/move.ts#L11682)；StatusEffectAttr、StatStageChangeAttr |
| 245 | 辅助齿轮（gearUp） | 已核验；修订 | 启动齿轮，提高特性为正电和负电的宝可梦的攻击和特攻 | 使自己和场上同伴中具有正电或负电特性的宝可梦，攻击和特攻各提高1级。 | [GEAR_UP](../src/data/moves/move.ts#L11693)；StatStageChangeAttr |
| 246 | 深渊突刺（throatChop） | 已核验；保留 | 原文＝现文 | 受到此招式攻击的对手，会因为地狱般的痛苦，在２回合内，变得无法使出声音类招式 | [THROAT_CHOP](../src/data/moves/move.ts#L11705)；AddBattlerTagAttr |
| 247 | 花粉团（pollenPuff） | 已核验；保留 | 原文＝现文 | 以会爆炸的花粉团攻击对手；对同伴使用时，改为回复其最大HP的一半。 | [POLLEN_PUFF](../src/data/moves/move.ts#L11707)；HealOnAllyAttr |
| 248 | 掷锚（anchorShot） | 已核验；保留 | 原文＝现文 | 将锚缠住对手进行攻击。使对手无法逃走 | [ANCHOR_SHOT](../src/data/moves/move.ts#L11716)；AddBattlerTagAttr |
| 249 | 精神场地（psychicTerrain） | 已核验；修订 | 在５回合内，地面上的宝可梦不会受到先制招式的攻击。超能力属性的招式威力会提高 | 形成精神场地5回合。接地的宝可梦免受对手先制招式影响，使用超能力属性招式时威力提高30%。 | [PSYCHIC_TERRAIN](../src/data/moves/move.ts#L11718)；TerrainChangeAttr |
| 250 | 净化（purify） | 已核验；修订 | 治愈对手的异常状态。治愈后可以回复自己的HP | 治愈目标的异常状态，并回复自身最大HP的一半；目标没有异常状态时失败。 | [PURIFY](../src/data/moves/move.ts#L11745)；HealAttr、HealStatusEffectAttr |
| 251 | 觉醒之舞（revelationDance） | 已核验；修订 | 全力跳舞进行攻击。此招式的属性将变得和自己的属性相同 | 全力跳舞攻击，招式属性变为使用者当前的第一属性。 | [REVELATION_DANCE](../src/data/moves/move.ts#L11756)；MatchUserTypeAttr |
| 252 | 核心惩罚者（coreEnforcer） | 已核验；修订 | 如果给予过伤害的对手已经结束行动，其特性就会被消除 | 攻击所有对手；若命中目标本回合已经行动，则压制其可被压制的特性。 | [CORE_ENFORCER](../src/data/moves/move.ts#L11759)；SuppressAbilitiesIfActedAttr |
| 253 | 号令（instruct） | 已核验；保留 | 原文＝现文 | 向对手下达指示，让其再次使出刚才的招式 | [INSTRUCT](../src/data/moves/move.ts#L11764)；RepeatMoveAttr |
| 254 | 鸟嘴加农炮（beakBlast） | 已核验；保留 | 原文＝现文 | 先加热鸟嘴后再进行攻击。鸟嘴在加热时对手触碰的话，就会使其灼伤 | [BEAK_BLAST](../src/data/moves/move.ts#L11775)；BeakBlastHeaderAttr |
| 255 | 鳞片噪音（clangingScales） | 已核验；修订 | 摩擦全身鳞片，发出响亮的声音进行攻击。攻击后自己的防御会降低 | 用声音攻击所有对手，自己的防御降低1级。 | [CLANGING_SCALES](../src/data/moves/move.ts#L11779)；StatStageChangeAttr |
| 256 | 龙锤（dragonHammer） | 已核验；保留 | 原文＝现文 | 将身体当作锤子，向对手发动袭击，给予伤害 | [DRAGON_HAMMER](../src/data/moves/move.ts#L11783)；构造参数、目标与标记 |
| 257 | 极光幕（auroraVeil） | 已核验；修订 | 在５回合内减弱物理和特殊的伤害。只有下雪时才能使出 | 仅在雪天或冰雹中可用。在5回合内使我方受到的物理、特殊招式伤害减半，双打时改为减少三分之一。 | [AURORA_VEIL](../src/data/moves/move.ts#L11786)；AddArenaTagAttr |
| 258 | 花朵加农炮（fleurCannon） | 已核验；保留 | 原文＝现文 | 放出强力光束后，自己的特攻会大幅降低 | [FLEUR_CANNON](../src/data/moves/move.ts#L11828)；StatStageChangeAttr |
| 259 | 精神之牙（psychicFangs） | 已核验；保留 | 原文＝现文 | 利用精神力量咬住对手进行攻击。还可以破坏光墙和反射壁等 | [PSYCHIC_FANGS](../src/data/moves/move.ts#L11830)；RemoveScreensAttr |
| 260 | 跺脚（stompingTantrum） | 已核验；修订 | 化悔恨为力量进行攻击。如果上一回合招式没有打中，威力就会翻倍 | 攻击目标；若自己上一次招式未命中或使用失败，威力翻倍。 | [STOMPING_TANTRUM](../src/data/moves/move.ts#L11833)；MovePowerMultiplierAttr |
| 261 | 暗影之骨（shadowBone） | 已核验；修订 | 用附有灵魂的骨头殴打对手进行攻击。有时会降低对手的防御 | 用附有灵魂的骨头攻击目标，有20%的概率使其防御降低1级。 | [SHADOW_BONE](../src/data/moves/move.ts#L11844)；StatStageChangeAttr |
| 262 | 流星闪冲（sunsteelStrike） | 已核验；保留 | 原文＝现文 | 以流星般的气势猛撞对手。可以无视对手的特性进行攻击 | [SUNSTEEL_STRIKE](../src/data/moves/move.ts#L11855)；构造参数、目标与标记 |
| 263 | 暗影之光（moongeistBeam） | 已核验；保留 | 原文＝现文 | 放出奇怪的光线攻击对手。可以无视对手的特性进行攻击 | [MOONGEIST_BEAM](../src/data/moves/move.ts#L11857)；构造参数、目标与标记 |
| 264 | 泪眼汪汪（tearfulLook） | 已核验；保留 | 原文＝现文 | 变得泪眼汪汪，让对手丧失斗志。从而降低对手的攻击和特攻 | [TEARFUL_LOOK](../src/data/moves/move.ts#L11859)；StatStageChangeAttr |
| 265 | 智皮卡Ｚ千万伏特（tenMillionVoltThunderbolt） | 未实现；修订 | 戴着帽子的皮卡丘将通过Ｚ力量增强的电击全力释放给对手。容易击中要害 | 当前版本尚无可用实现。原设定：戴着帽子的皮卡丘将通过Ｚ力量增强的电击全力释放给对手。容易击中要害 | [TEN_MILLION_VOLT_THUNDERBOLT](../src/data/moves/move.ts#L11870)；构造参数、目标与标记 |
| 266 | 惊爆大头（mindBlown） | 已核验；修订 | 让自己的头爆炸，来攻击周围的一切。自己也会受到伤害 | 攻击周围所有其他宝可梦（包括同伴），自身损失最大HP的一半。 | [MIND_BLOWN](../src/data/moves/move.ts#L11874)；HalfSacrificialAttr |
| 267 | 光子喷涌（photonGeyser） | 已核验；修订 | 用光柱来进行攻击。比较自己的攻击和特攻，用数值相对较高的一项给予对方伤害 | 无视目标可被忽略的特性。自己的攻击高于特攻时作为物理招式，否则作为特殊招式攻击。 | [PHOTON_GEYSER](../src/data/moves/move.ts#L11881)；PhotonGeyserCategoryAttr |
| 268 | 究极奈克洛Ｚ焚天灭世炽光爆（lightThatBurnsTheSky） | 未实现；修订 | 奈克洛兹玛会无视对手的特性效果，在攻击和特攻之间，用数值相对较高的一项给予对方伤害 | 当前版本尚无可用实现。原设定：奈克洛兹玛会无视对手的特性效果，在攻击和特攻之间，用数值相对较高的一项给予对方伤害 | [LIGHT_THAT_BURNS_THE_SKY](../src/data/moves/move.ts#L11885)；PhotonGeyserCategoryAttr |
| 269 | 索尔迦雷欧Ｚ日光回旋下苍穹（searingSunrazeSmash） | 未实现；修订 | 得到Ｚ力量的索尔迦雷欧将全力进行攻击。可以无视对手的特性效果 | 当前版本尚无可用实现。原设定：得到Ｚ力量的索尔迦雷欧将全力进行攻击。可以无视对手的特性效果 | [SEARING_SUNRAZE_SMASH](../src/data/moves/move.ts#L11889)；构造参数、目标与标记 |
| 270 | 露奈雅拉Ｚ月华飞溅落灵霄（menacingMoonrazeMaelstrom） | 未实现；修订 | 得到Ｚ力量的露奈雅拉将全力进行攻击。可以无视对手的特性效果 | 当前版本尚无可用实现。原设定：得到Ｚ力量的露奈雅拉将全力进行攻击。可以无视对手的特性效果 | [MENACING_MOONRAZE_MAELSTROM](../src/data/moves/move.ts#L11892)；构造参数、目标与标记 |
| 271 | 活活气泡（bouncyBubble） | 已核验；保留 | 原文＝现文 | 投掷水球进行攻击。吸水后能回复等同于造成的伤害的HP | [BOUNCY_BUBBLE](../src/data/moves/move.ts#L11921)；HitHealAttr |
| 272 | 麻麻电击（buzzyBuzz） | 已核验；保留 | 原文＝现文 | 放出电击攻击对手。让对手陷入麻痹状态 | [BUZZY_BUZZ](../src/data/moves/move.ts#L11924)；StatusEffectAttr |
| 273 | 熊熊火爆（sizzlySlide） | 已核验；保留 | 原文＝现文 | 用燃起大火的身体猛烈地冲撞对手。让对手陷入灼伤状态 | [SIZZLY_SLIDE](../src/data/moves/move.ts#L11926)；StatusEffectAttr |
| 274 | 哗哗气场（glitzyGlow） | 已核验；修订 | 利用念力强攻，粉碎对方信心。制造一道能减弱对手特殊攻击的神奇墙壁 | 攻击目标，并在我方设置光墙5回合，特殊招式伤害减半，双打时改为减少三分之一。 | [GLITZY_GLOW](../src/data/moves/move.ts#L11928)；AddArenaTagAttr |
| 275 | 茁茁炸弹（sappySeed） | 已核验；保留 | 原文＝现文 | 长出巨大的藤蔓，播撒种子进行攻击。种子每回合都会吸取对手的HP | [SAPPY_SEED](../src/data/moves/move.ts#L11932)；LeechSeedAttr |
| 276 | 亮亮风暴（sparklySwirl） | 已核验；保留 | 原文＝现文 | 利用芬芳刺鼻的龙卷风吞噬对方。能治愈我方宝可梦的异常状态 | [SPARKLY_SWIRL](../src/data/moves/move.ts#L11937)；PartyStatusCureAttr |
| 277 | 极巨炮（dynamaxCannon） | 已核验；保留 | 原文＝现文 | 将凝缩在体内的能量从核心放出进行攻击，对手等级比当前波次的等级上限越高，造成的伤害越高，最多两倍。 | [DYNAMAX_CANNON](../src/data/moves/move.ts#L11951)；MovePowerMultiplierAttr |
| 278 | 狙击（snipeShot） | 已核验；修订 | 能无视具有吸引对手招式效果的特性或招式的影响。可以向选定的对手进行攻击 | 攻击选定目标，无视吸引招式的特性和招式效果，且容易击中要害。 | [SNIPE_SHOT](../src/data/moves/move.ts#L11965)；HighCritAttr、BypassRedirectAttr |
| 279 | 大快朵颐（stuffCheeks） | 已核验；保留 | 原文＝现文 | 吃掉携带的树果，大幅提高防御 | [STUFF_CHEEKS](../src/data/moves/move.ts#L11971)；EatBerryAttr、StatStageChangeAttr |
| 280 | 背水一战（noRetreat） | 已核验；修订 | 提高自己的所有能力，但无法替换或逃走 | 攻击、防御、特攻、特防和速度各提高1级，并使自己不能替换或逃走；已受此招式束缚时无法再次使用。 | [NO_RETREAT](../src/data/moves/move.ts#L11980)；StatStageChangeAttr、AddBattlerTagAttr |
| 281 | 沥青射击（tarShot） | 已核验；修订 | 泼洒黏糊糊的沥青，降低对手的速度。火属性会变成对手的弱点 | 使目标速度降低1级，受到火属性攻击时的相性倍率翻倍；不能给已太晶化的目标附加火属性增伤效果。 | [TAR_SHOT](../src/data/moves/move.ts#L11985)；StatStageChangeAttr、AddBattlerTagAttr |
| 282 | 魔法粉（magicPowder） | 已核验；保留 | 原文＝现文 | 向对手喷洒魔法粉，使对手变为超能力属性 | [MAGIC_POWDER](../src/data/moves/move.ts#L11989)；ChangeTypeAttr |
| 283 | 龙箭（dragonDarts） | 部分实现；修订 | 让多龙梅西亚进行２次攻击。如果对手有２只宝可梦，则对它们各进行１次攻击 | 对选定目标连续攻击2次。当前版本未实现双打时自动向两名对手分配攻击。 | [DRAGON_DARTS](../src/data/moves/move.ts#L11993)；MultiHitAttr |
| 284 | 茶会（teatime） | 已核验；保留 | 原文＝现文 | 举办一场茶会，场上的所有宝可梦都会吃掉自己携带的树果 | [TEATIME](../src/data/moves/move.ts#L11997)；EatBerryAttr |
| 285 | 蛸固（octolock） | 已核验；保留 | 原文＝现文 | 让对手无法逃走。对手被固定后，每回合都会降低防御和特防 | [OCTOLOCK](../src/data/moves/move.ts#L12000)；AddBattlerTagAttr |
| 286 | 电喙（boltBeak） | 已核验；保留 | 原文＝现文 | 用带电的喙啄刺对手。如果比对手先出手攻击，招式的威力会变成２倍 | [BOLT_BEAK](../src/data/moves/move.ts#L12003)；MovePowerMultiplierAttr |
| 287 | 鳃咬（fishiousRend） | 已核验；保留 | 原文＝现文 | 用坚硬的腮咬住对手。如果比对手先出手攻击，招式的威力会变成２倍 | [FISHIOUS_REND](../src/data/moves/move.ts#L12005)；MovePowerMultiplierAttr |
| 288 | 极巨火爆（maxFlare） | 未实现；修订 | 极巨化宝可梦使出的火属性攻击。可在５回合内让日照变得强烈 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的火属性攻击。可在５回合内让日照变得强烈 | [MAX_FLARE](../src/data/moves/move.ts#L12025)；构造参数、目标与标记 |
| 289 | 极巨闪电（maxLightning） | 未实现；修订 | 极巨化宝可梦使出的电属性攻击。可在５回合内将脚下变成电气场地 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的电属性攻击。可在５回合内将脚下变成电气场地 | [MAX_LIGHTNING](../src/data/moves/move.ts#L12031)；构造参数、目标与标记 |
| 290 | 极巨拳斗（maxKnuckle） | 未实现；修订 | 极巨化宝可梦使出的格斗属性攻击。会提高我方的攻击 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的格斗属性攻击。会提高我方的攻击 | [MAX_KNUCKLE](../src/data/moves/move.ts#L12037)；构造参数、目标与标记 |
| 291 | 极巨寒冰（maxHailstorm） | 未实现；修订 | 极巨化宝可梦使出的冰属性攻击。在５回合内会下雪 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的冰属性攻击。在５回合内会下雪 | [MAX_HAILSTORM](../src/data/moves/move.ts#L12043)；构造参数、目标与标记 |
| 292 | 极巨酸毒（maxOoze） | 未实现；修订 | 极巨化宝可梦使出的毒属性攻击。会提高我方的特攻 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的毒属性攻击。会提高我方的特攻 | [MAX_OOZE](../src/data/moves/move.ts#L12046)；构造参数、目标与标记 |
| 293 | 极巨水流（maxGeyser） | 未实现；修订 | 极巨化宝可梦使出的水属性攻击。可在５回合内降下大雨 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的水属性攻击。可在５回合内降下大雨 | [MAX_GEYSER](../src/data/moves/move.ts#L12049)；构造参数、目标与标记 |
| 294 | 极巨飞冲（maxAirstream） | 未实现；修订 | 极巨化宝可梦使出的飞行属性攻击。会提高我方的速度 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的飞行属性攻击。会提高我方的速度 | [MAX_AIRSTREAM](../src/data/moves/move.ts#L12052)；构造参数、目标与标记 |
| 295 | 极巨妖精（maxStarfall） | 未实现；修订 | 极巨化宝可梦使出的妖精属性攻击。可在５回合内将脚下变成薄雾场地 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的妖精属性攻击。可在５回合内将脚下变成薄雾场地 | [MAX_STARFALL](../src/data/moves/move.ts#L12055)；构造参数、目标与标记 |
| 296 | 极巨超能（maxMindstorm） | 未实现；修订 | 极巨化宝可梦使出的超能力属性攻击。可在５回合内将脚下变成精神场地 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的超能力属性攻击。可在５回合内将脚下变成精神场地 | [MAX_MINDSTORM](../src/data/moves/move.ts#L12061)；构造参数、目标与标记 |
| 297 | 极巨岩石（maxRockfall） | 未实现；修订 | 极巨化宝可梦使出的岩石属性攻击。可在５回合内卷起沙暴 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的岩石属性攻击。可在５回合内卷起沙暴 | [MAX_ROCKFALL](../src/data/moves/move.ts#L12064)；构造参数、目标与标记 |
| 298 | 极巨大地（maxQuake） | 未实现；修订 | 极巨化宝可梦使出的地面属性攻击。会提高我方的特防 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的地面属性攻击。会提高我方的特防 | [MAX_QUAKE](../src/data/moves/move.ts#L12067)；构造参数、目标与标记 |
| 299 | 极巨草原（maxOvergrowth） | 未实现；修订 | 极巨化宝可梦使出的草属性攻击。可在５回合内将脚下变成青草场地 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的草属性攻击。可在５回合内将脚下变成青草场地 | [MAX_OVERGROWTH](../src/data/moves/move.ts#L12073)；构造参数、目标与标记 |
| 300 | 极巨钢铁（maxSteelspike） | 未实现；修订 | 极巨化宝可梦使出的钢属性攻击。会提高我方的防御 | 当前版本尚无可用实现。原设定：极巨化宝可梦使出的钢属性攻击。会提高我方的防御 | [MAX_STEELSPIKE](../src/data/moves/move.ts#L12076)；构造参数、目标与标记 |
| 301 | 魂舞烈音爆（clangorousSoul） | 已核验；修订 | 削减少许自己的HP，使所有能力都提高 | 消耗自身最大HP的三分之一，使攻击、防御、特攻、特防和速度各提高1级。剩余HP不足时失败。 | [CLANGOROUS_SOUL](../src/data/moves/move.ts#L12080)；CutHpStatStageBoostAttr |
| 302 | 扑击（bodyPress） | 已核验；修订 | 用身体撞向对手进行攻击。防御越高，给予的伤害就越高 | 用自己的防御代替攻击来计算伤害，仍属于物理招式。 | [BODY_PRESS](../src/data/moves/move.ts#L12085)；DefAtkAttr |
| 303 | 装饰（decorate） | 已核验；修订 | 通过装饰，大幅提高对方的攻击和特攻 | 使目标的攻击和特攻各提高2级，可对同伴使用，且无视守住。 | [DECORATE](../src/data/moves/move.ts#L12087)；StatStageChangeAttr |
| 304 | 捕兽夹（snapTrap） | 已核验；修订 | 使用捕兽夹，在４～５回合内，夹住对手进行攻击 | 攻击并束缚目标4至5回合，每回合结束造成最大HP的1/8伤害；束缚期间不能通常替换或逃走。 | [SNAP_TRAP](../src/data/moves/move.ts#L12094)；TrapAttr |
| 305 | 气场轮（auraWheel） | 已核验；修订 | 用储存在颊囊里的能量进行攻击，并提高自己的速度。如果由莫鲁贝可使用，其属性会随着它的样子而改变 | 攻击并使自己速度提高1级。莫鲁贝可及包含它的融合宝可梦在空腹形态时变为恶属性，否则为电属性。 | [AURA_WHEEL](../src/data/moves/move.ts#L12104)；StatStageChangeAttr、AuraWheelTypeAttr |
| 306 | 破音（overdrive） | 已核验；修订 | 奏响吉他和贝斯，释放出发出巨响的剧烈震动攻击对手 | 用声音攻击所有对手。 | [OVERDRIVE](../src/data/moves/move.ts#L12112)；构造参数、目标与标记 |
| 307 | 生命水滴（lifeDew） | 已核验；保留 | 原文＝现文 | 回复自己和场上同伴各自最大HP的四分之一。 | [LIFE_DEW](../src/data/moves/move.ts#L12125)；HealAttr |
| 308 | 流星突击（meteorAssault） | 已核验；保留 | 原文＝现文 | 大力挥舞粗壮的茎进行攻击。但同时自己也会被晃晕，下一回合自己将无法动弹 | [METEOR_ASSAULT](../src/data/moves/move.ts#L12135)；RechargeAttr |
| 309 | 铁蹄光线（steelBeam） | 已核验；保留 | 原文＝现文 | 发射钢铁光束攻击目标。攻击后自身损失最大HP的一半。 | [STEEL_BEAM](../src/data/moves/move.ts#L12140)；HalfSacrificialAttr |
| 310 | 铁滚轮（steelRoller） | 已核验；保留 | 原文＝现文 | 在破坏场地的同时攻击对手。如果脚下没有任何场地状态存在，使出此招式时便会失败 | [STEEL_ROLLER](../src/data/moves/move.ts#L12151)；ClearTerrainAttr |
| 311 | 鳞射（scaleShot） | 已核验；保留 | 原文＝现文 | 发射鳞片进行攻击。连续攻击２～５次。速度会提高但防御会降低 | [SCALE_SHOT](../src/data/moves/move.ts#L12154)；StatStageChangeAttr、MultiHitAttr |
| 312 | 流星光束（meteorBeam） | 已核验；保留 | 原文＝现文 | 第１回合聚集宇宙之力提高特攻，第２回合攻击对手 | [METEOR_BEAM](../src/data/moves/move.ts#L12159)；StatStageChangeAttr |
| 313 | 青草滑梯（grassyGlide） | 已核验；修订 | 仿佛在地面上滑行般地攻击对手。在青草场地上，必定能够先制攻击 | 攻击目标；自己接地且处于青草场地时，招式优先度提高1。 | [GRASSY_GLIDE](../src/data/moves/move.ts#L12174)；IncrementMovePriorityAttr |
| 314 | 电力上升（risingVoltage） | 已核验；修订 | 用从地面升腾而起的电击进行攻击。当对手处于电气场地上时，招式威力会变成２倍 | 攻击目标；目标接地且处于电气场地时，威力翻倍。 | [RISING_VOLTAGE](../src/data/moves/move.ts#L12179)；MovePowerMultiplierAttr |
| 315 | 大地波动（terrainPulse） | 已核验；修订 | 借助场地的力量进行攻击。视使出招式时场地状态不同，招式的属性和威力会有所变化 | 自己接地且存在场地时威力翻倍，并随电气、青草、薄雾、精神场地分别变为电、草、妖精、超能力属性。 | [TERRAIN_PULSE](../src/data/moves/move.ts#L12183)；TerrainPulseTypeAttr、MovePowerMultiplierAttr |
| 316 | 灵骚（poltergeist） | 已核验；保留 | 原文＝现文 | 操纵对手的持有物进行攻击。当对手没有携带道具时，使出此招式时便会失败 | [POLTERGEIST](../src/data/moves/move.ts#L12196)；PreMoveMessageAttr |
| 317 | 腐蚀气体（corrosiveGas） | 未实现；修订 | 用具有强酸性的气体包裹住自己周围所有的宝可梦，并融化其所携带的道具 | 当前版本尚无可用实现。原设定：用具有强酸性的气体包裹住自己周围所有的宝可梦，并融化其所携带的道具 | [CORROSIVE_GAS](../src/data/moves/move.ts#L12200)；构造参数、目标与标记 |
| 318 | 双翼（dualWingbeat） | 已核验；保留 | 原文＝现文 | 将翅膀撞向对手进行攻击。连续２次给予伤害 | [DUAL_WINGBEAT](../src/data/moves/move.ts#L12214)；MultiHitAttr |
| 319 | 丛林治疗（jungleHealing） | 已核验；保留 | 原文＝现文 | 回复自己和场上同伴各自最大HP的四分之一，并解除异常状态。 | [JUNGLE_HEALING](../src/data/moves/move.ts#L12220)；HealAttr、HealStatusEffectAttr |
| 320 | 暗冥强击（wickedBlow） | 已核验；保留 | 原文＝现文 | 将恶之流派修炼至大成的猛烈一击。必定会击中要害 | [WICKED_BLOW](../src/data/moves/move.ts#L12226)；CritOnlyAttr |
| 321 | 水流连打（surgingStrikes） | 已核验；保留 | 原文＝现文 | 将水之流派修炼至大成的仿若行云流水般的３次连击。必定会击中要害 | [SURGING_STRIKES](../src/data/moves/move.ts#L12229)；MultiHitAttr、CritOnlyAttr |
| 322 | 雷电囚笼（thunderCage） | 已核验；修订 | 将对手困在电流四溅的囚笼中，在４～５回合内进行攻击 | 攻击并束缚目标4至5回合，每回合结束造成最大HP的1/8伤害；束缚期间不能通常替换或逃走。 | [THUNDER_CAGE](../src/data/moves/move.ts#L12233)；TrapAttr |
| 323 | 怒火中烧（fieryWrath） | 已核验；修订 | 将愤怒转化为火焰般的气场进行攻击。有时会使对手畏缩 | 攻击所有对手，有20%的概率使目标畏缩。 | [FIERY_WRATH](../src/data/moves/move.ts#L12240)；FlinchAttr |
| 324 | 诡异咒语（eerieSpell） | 已核验；保留 | 原文＝现文 | 用强大的精神力量攻击。让对手最后使用的招式减少３PP | [EERIE_SPELL](../src/data/moves/move.ts#L12250)；AttackReducePpMoveAttr |
| 325 | 克命爪（direClaw） | 已核验；修订 | 以破灭之爪进行攻击。有时还会让对手陷入中毒、麻痹、睡眠之中的一种状态 | 攻击目标，有30%的概率随机使其陷入中毒、麻痹或睡眠中的一种状态。 | [DIRE_CLAW](../src/data/moves/move.ts#L12253)；MultiStatusEffectAttr |
| 326 | 岩斧（stoneAxe） | 已核验；修订 | 用岩石之斧进行攻击。散落的岩石碎片会飘浮在对手周围 | 攻击目标，并在对方场地布下隐形岩。 | [STONE_AXE](../src/data/moves/move.ts#L12261)；AddArenaTrapTagHitAttr |
| 327 | 阳春风暴（springtideStorm） | 已核验；修订 | 用交织着爱与恨的烈风席卷对手进行攻击。有时会降低对手的攻击 | 用风攻击所有对手，有30%的概率使目标攻击降低1级。 | [SPRINGTIDE_STORM](../src/data/moves/move.ts#L12264)；StatStageChangeAttr |
| 328 | 大愤慨（ragingFury） | 已核验；保留 | 原文＝现文 | 在２～３回合内，一边放出火焰，一边疯狂乱打。大闹一番后自己会陷入混乱 | [RAGING_FURY](../src/data/moves/move.ts#L12270)；AddBattlerTagAttr |
| 329 | 波动冲（waveCrash） | 已核验；修订 | 让水覆盖全身后撞向对手。自己也会受到不少伤害 | 用水流撞击目标，自己承受相当于所造成伤害33%的反作用伤害。 | [WAVE_CRASH](../src/data/moves/move.ts#L12274)；RecoilAttr |
| 330 | 叶绿爆震（chloroblast） | 已核验；修订 | 释放凝聚的叶绿素攻击目标。攻击后自身损失最大HP的一半。 | 成功命中后，自身损失最大HP的一半；未命中或使用失败时不损失HP。 | [CHLOROBLAST](../src/data/moves/move.ts#L12277)；RecoilAttr |
| 331 | 冰山风（mountainGale） | 已核验；修订 | 将冰山般巨大的冰块砸向对手进行攻击。有时会使对手畏缩 | 将冰山般巨大的冰块砸向对手进行攻击。有30%的概率使对手畏缩 | [MOUNTAIN_GALE](../src/data/moves/move.ts#L12279)；FlinchAttr |
| 332 | 毒千针（barbBarrage） | 已核验；修订 | 用无数的毒针进行攻击。有时还会让对手陷入中毒状态。攻击处于中毒状态的对手时，威力会变成２倍 | 攻击目标，有50%的概率使其中毒；目标已经中毒或剧毒时，威力翻倍。 | [BARB_BARRAGE](../src/data/moves/move.ts#L12288)；MovePowerMultiplierAttr、StatusEffectAttr |
| 333 | 气场之翼（esperWing） | 已核验；保留 | 原文＝现文 | 用经过气场强化的翅膀撕裂对手。容易击中要害。会提高自己的速度 | [ESPER_WING](../src/data/moves/move.ts#L12296)；HighCritAttr、StatStageChangeAttr |
| 334 | 三连箭（tripleArrows） | 已核验；修订 | 使出一记腿技后同时发射３箭。有时会降低对手的防御或使对手畏缩。容易击中要害 | 攻击目标一次，容易击中要害；有50%的概率使目标防御降低1级，另有30%的概率使其畏缩。 | [TRIPLE_ARROWS](../src/data/moves/move.ts#L12303)；HighCritAttr、StatStageChangeAttr、FlinchAttr |
| 335 | 群魔乱舞（infernalParade） | 已核验；修订 | 用无数的火球进行攻击。有时会让对手陷入灼伤状态。攻击处于异常状态的对手时，威力会变成２倍 | 用无数的火球进行攻击。有30%的概率让对手陷入灼伤状态。攻击处于异常状态的对手时，威力会变成２倍 | [INFERNAL_PARADE](../src/data/moves/move.ts#L12308)；StatusEffectAttr、MovePowerMultiplierAttr |
| 336 | 秘剑・千重涛（ceaselessEdge） | 已核验；保留 | 原文＝现文 | 用贝壳之剑进行攻击。散落的贝壳碎片会散落在对手脚下成为撒菱 | [CEASELESS_EDGE](../src/data/moves/move.ts#L12311)；AddArenaTrapTagHitAttr |
| 337 | 枯叶风暴（bleakwindStorm） | 已核验；修订 | 用足以让身心都止不住颤抖的冰冷狂风进行攻击。有时会降低对手的速度 | 攻击所有对手，有30%的概率使目标速度降低1级；雨天或大雨中必中。 | [BLEAKWIND_STORM](../src/data/moves/move.ts#L12314)；StormAccuracyAttr、StatStageChangeAttr |
| 338 | 鸣雷风暴（wildboltStorm） | 已核验；修订 | 呼唤雷云引起风暴，用雷与风进行激烈的攻击。有时会让对手陷入麻痹状态 | 攻击所有对手，有20%的概率使目标麻痹；雨天或大雨中必中。 | [WILDBOLT_STORM](../src/data/moves/move.ts#L12319)；StormAccuracyAttr、StatusEffectAttr |
| 339 | 热沙风暴（sandsearStorm） | 已核验；修订 | 用灼热的沙子和强烈的风席卷对手进行攻击。有时会让对手陷入灼伤状态 | 攻击所有对手，有20%的概率使目标灼伤；雨天或大雨中必中。 | [SANDSEAR_STORM](../src/data/moves/move.ts#L12324)；StormAccuracyAttr、StatusEffectAttr |
| 340 | 新月祈祷（lunarBlessing） | 已核验；修订 | 回复自己和场上同伴各自最大HP的四分之一，并解除异常状态。 | 回复自己和场上同伴各自最大HP的四分之一，并解除异常状态。月圆之夜改为回复全部HP；大黑天下无效。 | [LUNAR_BLESSING](../src/data/moves/move.ts#L12329)；HealAttr、HealStatusEffectAttr |
| 341 | 超极巨深渊灭焰（gMaxWildfire） | 未注册；修订 | 超极巨化的喷火龙使出的火属性攻击。可在４回合内给予对手伤害 | 当前版本尚无可用实现。原设定：超极巨化的喷火龙使出的火属性攻击。可在４回合内给予对手伤害 | [G_MAX_WILDFIRE](../src/data/moves/move.ts#L12345)；构造参数、目标与标记 |
| 342 | 超极巨会心一击（gMaxChiStrike） | 未注册；修订 | 超极巨化的怪力使出的格斗属性攻击。会变得容易击中要害 | 当前版本尚无可用实现。原设定：超极巨化的怪力使出的格斗属性攻击。会变得容易击中要害 | [G_MAX_CHI_STRIKE](../src/data/moves/move.ts#L12357)；构造参数、目标与标记 |
| 343 | 超极巨极光旋律（gMaxResonance） | 未注册；修订 | 超极巨化的拉普拉斯使出的冰属性攻击。可在５回合内减弱受到的伤害 | 当前版本尚无可用实现。原设定：超极巨化的拉普拉斯使出的冰属性攻击。可在５回合内减弱受到的伤害 | [G_MAX_RESONANCE](../src/data/moves/move.ts#L12363)；构造参数、目标与标记 |
| 344 | 超极巨资源再生（gMaxReplenish） | 未注册；修订 | 超极巨化的卡比兽使出的一般属性攻击。会让吃掉的树果再生 | 当前版本尚无可用实现。原设定：超极巨化的卡比兽使出的一般属性攻击。会让吃掉的树果再生 | [G_MAX_REPLENISH](../src/data/moves/move.ts#L12369)；构造参数、目标与标记 |
| 345 | 超极巨岩阵以待（gMaxStonesurge） | 未注册；修订 | 超极巨化的暴噬龟使出的水属性攻击。会发射无数锐利的岩石 | 当前版本尚无可用实现。原设定：超极巨化的暴噬龟使出的水属性攻击。会发射无数锐利的岩石 | [G_MAX_STONESURGE](../src/data/moves/move.ts#L12375)；构造参数、目标与标记 |
| 346 | 超极巨旋风袭卷（gMaxWindRage） | 未注册；修订 | 超极巨化的钢铠鸦使出的飞行属性攻击。可消除反射壁和光墙 | 当前版本尚无可用实现。原设定：超极巨化的钢铠鸦使出的飞行属性攻击。可消除反射壁和光墙 | [G_MAX_WIND_RAGE](../src/data/moves/move.ts#L12378)；构造参数、目标与标记 |
| 347 | 超极巨幸福圆满（gMaxFinale） | 未注册；修订 | 超极巨化的霜奶仙使出的妖精属性攻击。可回复我方的HP | 当前版本尚无可用实现。原设定：超极巨化的霜奶仙使出的妖精属性攻击。可回复我方的HP | [G_MAX_FINALE](../src/data/moves/move.ts#L12384)；构造参数、目标与标记 |
| 348 | 超极巨劣化衰变（gMaxDepletion） | 未注册；修订 | 超极巨化的铝钢龙使出的龙属性攻击。可减少对手最后使用的招式的PP | 当前版本尚无可用实现。原设定：超极巨化的铝钢龙使出的龙属性攻击。可减少对手最后使用的招式的PP | [G_MAX_DEPLETION](../src/data/moves/move.ts#L12387)；构造参数、目标与标记 |
| 349 | 超极巨炎石喷发（gMaxVolcalith） | 未注册；修订 | 超极巨化的巨炭山使出的岩石属性攻击。可在４回合内给予对手伤害 | 当前版本尚无可用实现。原设定：超极巨化的巨炭山使出的岩石属性攻击。可在４回合内给予对手伤害 | [G_MAX_VOLCALITH](../src/data/moves/move.ts#L12393)；构造参数、目标与标记 |
| 350 | 超极巨沙尘漫天（gMaxSandblast） | 未注册；修订 | 超极巨化的沙螺蟒使出的地面属性攻击。在４～５回合内会狂刮沙暴 | 当前版本尚无可用实现。原设定：超极巨化的沙螺蟒使出的地面属性攻击。在４～５回合内会狂刮沙暴 | [G_MAX_SANDBLAST](../src/data/moves/move.ts#L12396)；构造参数、目标与标记 |
| 351 | 超极巨百火焚野（gMaxCentiferno） | 未注册；修订 | 超极巨化的焚焰蚣使出的火属性攻击。可在４～５回合内将对手困在火焰中 | 当前版本尚无可用实现。原设定：超极巨化的焚焰蚣使出的火属性攻击。可在４～５回合内将对手困在火焰中 | [G_MAX_CENTIFERNO](../src/data/moves/move.ts#L12420)；构造参数、目标与标记 |
| 352 | 超极巨灰飞鞭灭（gMaxVineLash） | 未注册；修订 | 超极巨化的妙蛙花使出的草属性攻击。可在４回合内给予对手伤害 | 当前版本尚无可用实现。原设定：超极巨化的妙蛙花使出的草属性攻击。可在４回合内给予对手伤害 | [G_MAX_VINE_LASH](../src/data/moves/move.ts#L12423)；构造参数、目标与标记 |
| 353 | 超极巨水炮轰灭（gMaxCannonade） | 未注册；修订 | 超极巨化的水箭龟使出的水属性攻击。可在４回合内给予对手伤害 | 当前版本尚无可用实现。原设定：超极巨化的水箭龟使出的水属性攻击。可在４回合内给予对手伤害 | [G_MAX_CANNONADE](../src/data/moves/move.ts#L12426)；构造参数、目标与标记 |
| 354 | 超极巨狂擂乱打（gMaxDrumSolo） | 未注册；修订 | 超极巨化的轰擂金刚猩使出的草属性攻击。不会受到对手特性的干扰 | 当前版本尚无可用实现。原设定：超极巨化的轰擂金刚猩使出的草属性攻击。不会受到对手特性的干扰 | [G_MAX_DRUM_SOLO](../src/data/moves/move.ts#L12429)；构造参数、目标与标记 |
| 355 | 超极巨破阵火球（gMaxFireball） | 未注册；修订 | 超极巨化的闪焰王牌使出的火属性攻击。不会受到对手特性的干扰 | 当前版本尚无可用实现。原设定：超极巨化的闪焰王牌使出的火属性攻击。不会受到对手特性的干扰 | [G_MAX_FIREBALL](../src/data/moves/move.ts#L12432)；构造参数、目标与标记 |
| 356 | 超极巨狙击神射（gMaxHydrosnipe） | 未注册；修订 | 超极巨化的千面避役使出的水属性攻击。不会受到对手特性的干扰 | 当前版本尚无可用实现。原设定：超极巨化的千面避役使出的水属性攻击。不会受到对手特性的干扰 | [G_MAX_HYDROSNIPE](../src/data/moves/move.ts#L12435)；构造参数、目标与标记 |
| 357 | 超极巨夺命一击（gMaxOneBlow） | 未注册；修订 | 超极巨化的武道熊师使出的恶属性攻击。是可以无视极巨防壁的一击 | 当前版本尚无可用实现。原设定：超极巨化的武道熊师使出的恶属性攻击。是可以无视极巨防壁的一击 | [G_MAX_ONE_BLOW](../src/data/moves/move.ts#L12438)；构造参数、目标与标记 |
| 358 | 超极巨流水连击（gMaxRapidFlow） | 未注册；修订 | 超极巨化的武道熊师使出的水属性攻击。是可以无视极巨防壁的连击 | 当前版本尚无可用实现。原设定：超极巨化的武道熊师使出的水属性攻击。是可以无视极巨防壁的连击 | [G_MAX_RAPID_FLOW](../src/data/moves/move.ts#L12441)；构造参数、目标与标记 |
| 359 | 线阱（silkTrap） | 已核验；保留 | 原文＝现文 | 用丝设置陷阱。防住对方攻击的同时，能够降低所接触到的对手的速度 | [SILK_TRAP](../src/data/moves/move.ts#L12452)；ProtectAttr |
| 360 | 上菜（orderUp） | 已核验；保留 | 原文＝现文 | 以潇洒的身手进行攻击。若口中有米立龙，会按其样子提高能力 | [ORDER_UP](../src/data/moves/move.ts#L12469)；OrderUpStatBoostAttr |
| 361 | 鼠数儿（populationBomb） | 已核验；保留 | 原文＝现文 | 连续攻击1至10次，中途未命中时停止攻击。 | [POPULATION_BOMB](../src/data/moves/move.ts#L12479)；MultiHitAttr |
| 362 | 盐腌（saltCure） | 已核验；修订 | 使对手陷入盐腌状态，每回合给予对手伤害。对手为钢或水属性时会更痛苦 | 攻击并使目标盐腌，每回合结束损失最大HP的1/16；水或钢属性目标改为损失1/8。 | [SALT_CURE](../src/data/moves/move.ts#L12492)；AddBattlerTagAttr |
| 363 | 三连钻（tripleDive） | 已核验；保留 | 原文＝现文 | 以默契的跳跃溅起水花击向对手。连续３次给予伤害 | [TRIPLE_DIVE](../src/data/moves/move.ts#L12495)；MultiHitAttr |
| 364 | 晶光转转（mortalSpin） | 已核验；修订 | 旋转攻击对手并使其中毒，同时解除自身的束缚、寄生种子和我方场地上的入场陷阱。 | 攻击所有对手并使其中毒，同时解除自身束缚、寄生种子和我方场地上的入场陷阱。 | [MORTAL_SPIN](../src/data/moves/move.ts#L12497)；RemoveBattlerTagAttr、StatusEffectAttr、RemoveArenaTrapAttr |
| 365 | 甩肉（filletAway） | 已核验；保留 | 原文＝现文 | 消耗自身最大HP的一半，大幅提高攻击、特攻和速度。剩余HP不足时使用失败。 | [FILLET_AWAY](../src/data/moves/move.ts#L12520)；CutHpStatStageBoostAttr |
| 366 | 怒牛（ragingBull） | 已核验；修订 | 狂怒暴牛的猛烈冲撞。招式的属性随形态改变，光墙和反射壁等招式也能破坏 | 攻击并破坏目标一侧的屏障。帕底亚肯泰罗及包含它的融合宝可梦随形态变为格斗、火或水属性；其他使用者为一般属性。 | [RAGING_BULL](../src/data/moves/move.ts#L12534)；RagingBullTypeAttr、RemoveScreensAttr |
| 367 | 淘金潮（makeItRain） | 已核验；保留 | 原文＝现文 | 投掷大量硬币攻击所有对手，大幅降低自己的特攻。成功击中目标后可在战斗结束时获得金钱。 | [MAKE_IT_RAIN](../src/data/moves/move.ts#L12537)；MoneyAttr、StatStageChangeAttr |
| 368 | 大灾难（ruination） | 已核验；修订 | 引发毁灭性的灾厄，使对手的HP减半 | 造成相当于目标当前HP一半的伤害。 | [RUINATION](../src/data/moves/move.ts#L12548)；TargetHalfHpDamageAttr |
| 369 | 断尾（shedTail） | 已核验；保留 | 原文＝现文 | 消耗自身最大HP的一半制造替身，然后与后备宝可梦交换。 | [SHED_TAIL](../src/data/moves/move.ts#L12559)；AddSubstituteAttr、ForceSwitchOutAttr |
| 370 | 冷笑话（chillyReception） | 已核验；保留 | 原文＝现文 | 留下冷场的冷笑话后，和后备宝可梦进行替换。在５回合内会下雪 | [CHILLY_RECEPTION](../src/data/moves/move.ts#L12563)；PreMoveMessageAttr、ChillyReceptionAttr |
| 371 | 雪景（snowscape） | 已核验；修订 | 在５回合内会下雪。冰属性的防御会提高 | 形成雪天5回合，使冰属性宝可梦的防御变为1.5倍。 | [SNOWSCAPE](../src/data/moves/move.ts#L12575)；WeatherChangeAttr |
| 372 | 愤怒之拳（rageFist） | 已核验；保留 | 原文＝现文 | 每次受到招式伤害后，威力增加50，最高为350。离场后威力恢复原值。 | [RAGE_FIST](../src/data/moves/move.ts#L12588)；RageFistPowerAttr |
| 373 | 铠农炮（armorCannon） | 已核验；保留 | 原文＝现文 | 熊熊燃烧自己的铠甲，将其做成炮弹射出攻击。自己的防御和特防会降低 | [ARMOR_CANNON](../src/data/moves/move.ts#L12591)；StatStageChangeAttr |
| 374 | 悔念剑（bitterBlade） | 已核验；保留 | 原文＝现文 | 将对世间的留恋聚集于剑尖，并斩击对手。可以回复给予对手伤害的一半HP | [BITTER_BLADE](../src/data/moves/move.ts#L12593)；HitHealAttr |
| 375 | 电光双击（doubleShock） | 已核验；保留 | 原文＝现文 | 将全身所有的电力放出，给予对手大大的伤害。自己的电属性将会消失 | [DOUBLE_SHOCK](../src/data/moves/move.ts#L12597)；AddBattlerTagAttr、RemoveTypeAttr |
| 376 | 复仇（comeuppance） | 已核验；保留 | 原文＝现文 | 向本回合最后以招式伤害自己的对手，返还所受伤害的1.5倍。 | [COMEUPPANCE](../src/data/moves/move.ts#L12609)；CounterDamageAttr、CounterRedirectAttr |
| 377 | 水波刀（aquaCutter） | 已核验；保留 | 原文＝现文 | 如刀刃般喷射出加压的水切开对手。容易击中要害 | [AQUA_CUTTER](../src/data/moves/move.ts#L12614)；HighCritAttr |
| 378 | 灼热暴冲（blazingTorque） | 已核验；保留 | 原文＝现文 | 攻击目标造成伤害，有30%的几率使目标陷入灼伤状态。 | [BLAZING_TORQUE](../src/data/moves/move.ts#L12618)；StatusEffectAttr |
| 379 | 剧毒暴冲（noxiousTorque） | 已核验；保留 | 原文＝现文 | 攻击目标造成伤害，有30%的几率使目标陷入中毒状态。 | [NOXIOUS_TORQUE](../src/data/moves/move.ts#L12624)；StatusEffectAttr |
| 380 | 格斗暴冲（combatTorque） | 已核验；保留 | 原文＝现文 | 攻击目标造成伤害，有30%的几率使目标陷入麻痹状态。 | [COMBAT_TORQUE](../src/data/moves/move.ts#L12627)；StatusEffectAttr |
| 381 | 魔法暴冲（magicalTorque） | 已核验；保留 | 原文＝现文 | 攻击目标造成伤害，有30%的几率使目标陷入混乱状态。 | [MAGICAL_TORQUE](../src/data/moves/move.ts#L12630)；ConfuseAttr |
| 382 | 糖浆炸弹（syrupBomb） | 已核验；保留 | 原文＝现文 | 使粘稠的麦芽糖浆爆炸，让对手陷入满身糖状态，在３回合内持续降低其速度 | [SYRUP_BOMB](../src/data/moves/move.ts#L12642)；AddBattlerTagAttr |
| 383 | 棘藤棒（ivyCudgel） | 已核验；修订 | 用缠有藤蔓的棍棒殴打。属性会随所戴的面具而改变。容易击中要害 | 攻击目标，容易击中要害。厄诡椪及包含它的融合宝可梦随面具形态变为草、水、火或岩石属性；其他使用者为草属性。 | [IVY_CUDGEL](../src/data/moves/move.ts#L12645)；IvyCudgelTypeAttr、HighCritAttr |
| 384 | 晶光星群（teraStarstorm） | 部分实现；修订 | 照射出结晶的力量来驱逐敌人。太乐巴戈斯在星晶形态下使出时，能对所有对手造成伤害 | 通常为一般属性特殊攻击；太乐巴戈斯太晶化时变为星晶属性并攻击所有对手。太晶化使用者攻击高于特攻时改为物理招式。 | [TERA_STARSTORM](../src/data/moves/move.ts#L12653)；TeraMoveCategoryAttr、TeraStarstormTypeAttr、VariableTargetAttr |
| 385 | 火焰守护（burningBulwark） | 已核验；保留 | 原文＝现文 | 用超高温的体毛防住对手攻击的同时，让接触到自己的对手灼伤 | [BURNING_BULWARK](../src/data/moves/move.ts#L12667)；ProtectAttr |
| 386 | 强刃攻击（mightyCleave） | 已核验；保留 | 原文＝现文 | 用积蓄在头部的光来斩切对手。可以无视守护进行攻击 | [MIGHTY_CLEAVE](../src/data/moves/move.ts#L12672)；构造参数、目标与标记 |
| 387 | 龙声鼓舞（dragonCheer） | 已核验；保留 | 原文＝现文 | 鼓舞场上同伴，提高其击中要害率；龙属性提高2级，其他属性提高1级。 | [DRAGON_CHEER](../src/data/moves/move.ts#L12680)；AddBattlerTagAttr |
| 388 | 闪电强袭（supercellSlam） | 已核验；保留 | 原文＝现文 | 让身体带电撞击目标。未命中或失败时，自身损失最大HP的一半。目标使用过变小时，此招式威力翻倍且必定命中。 | [SUPERCELL_SLAM](../src/data/moves/move.ts#L12694)；AlwaysHitMinimizeAttr、HitsTagForDoubleDamageAttr、MissEffectAttr、NoEffectAttr |
| 389 | 精神噪音（psychicNoise） | 已核验；保留 | 原文＝现文 | 用令对手不舒服的音波进行攻击。让对手在２回合内无法通过招式、特性或携带的道具回复HP | [PSYCHIC_NOISE](../src/data/moves/move.ts#L12700)；AddBattlerTagAttr |

## 共用机制依据

- [招式效果、回复、反伤、概率、类型和威力计算](../src/data/moves/move.ts)
- [状态标签：挑衅、盐腌、束缚、扎根、混乱等](../src/data/battler-tags.ts)
- [场地标签：墙、毒菱、玩水、玩泥巴等](../src/data/arena-tag.ts)
- [命中、伤害、防御、异常免疫及形态](../src/field/pokemon.ts)
- [场地增伤与天气切换](../src/field/arena.ts)
- [月夜与大黑天的实际招式及预览](../src/data/moves/weather-moves.ts)
- [命中后的攻击记录与效果执行](../src/phases/move-effect-phase.ts)

## 验证

- 逐条记录检查：389行，编号连续、键无重复，覆盖本次全部389个条目。
- 确认简体和繁体资源中的这389条效果均为空，因此修订后的中文补充资源会实际生效。
- 现有测试：7个文件通过，58项通过、1项既有TODO。覆盖中文加载、冰冻干燥、挑衅、沥青射击、晶光星群、身体轻量化和自定义夜间天气。TODO为沥青射击的双效果均不可应用时的失败处理，不是本次引入。
- 中文资源格式检查通过；`git diff --check`通过；测试版构建通过。
- 本机Node 22低于项目声明的24.9最低版本，测试命令给出版本警告，但上述测试与构建均成功退出。未据此声称其余招式均已完成战斗模拟。
