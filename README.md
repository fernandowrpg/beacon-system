# BEACON para Foundry VTT (v13 e v14)

Sistema não oficial para o RPG **BEACON**. Implementa as regras de combate e de narrativa do livro básico; o conteúdo do livro (classes, talentos, NPCs, itens) **não** vem incluído e é cadastrado pela mesa (ver "Conteúdo").

## Instalação

No Foundry, vá em **Game Systems → Install System** e cole a URL do manifesto:

```
https://github.com/fernandowrpg/beacon-system/releases/latest/download/system.json
```

Instalação manual: extraia o `beacon.zip` da [última release](https://github.com/fernandowrpg/beacon-system/releases/latest) em `{Dados do Foundry}/Data/systems/beacon` e reinicie o Foundry. Depois crie um mundo com o sistema **BEACON**.

## O que o sistema faz

**Ficha de Beacon (PC)**
- Nível 1–12, **Grit** automático (+1 nos níveis pares), ability scores Bulk/Agility/Mind/Magic (0 a +6).
- Atributos derivados do **Job equipado** + ability scores + Grit: HP (+2/Bulk, +Grit), Recoveries (+1 a cada 2 de Bulk), Dodge (+Agility), Speed (+1 a cada 2 de Agility), Stress Cap (+Mind), Memory (+1 a cada 2 de Mind, +Grit), A-Def (+Magic), MP (+1 a cada 2 de Magic), Save Target (+Grit), Bloodied e Breaking.
- Armor somada dos itens equipados (máximo 4). Memory usada pelas técnicas equipadas (spells/skills que não são "free").
- Bônus manuais para efeitos de talentos/traits, além de resistências, imunidades e vulnerabilidades por tipo.
- Abas: Combate, Equipamento (job, armas, suporte, spells, skills, traits, limit break, suprimentos), Construção (ancestralidade, classes, talentos) e Narrativa (background skills, gold, residuum, biografia).

**Rolagens**
- d20 + modificadores, com **Accuracy/Difficulty**: cada uma rola d6 e fica com o maior; elas se cancelam 1 por 1, até 6.
- Ataques: 1d20 + Grit (PC) ou bônus do tier (NPC), contra Dodge ou A-Def (tag Aetheric). Uma rolagem por alvo marcado. 20+ é crítico; dano crítico rola os dados duas vezes e fica com os maiores.
- Defaults automáticos: Accurate, Inaccurate, Dazed, Engaged (ataque à distância), alvo Prone, alvo Invisible (d6 1–3 erra) e alvo Stunned (defesa 5).
- Testes de atributo (10+), saves (vs Save Target), skill checks narrativos (rank da background skill como Accuracy, +2 ao invocar o título; erro/acerto/crítico).
- Shift+clique pula o diálogo de rolagem.

**Dano e harm**
- Os botões do chat aplicam dano aos tokens selecionados (ou mirados): Vulnerable, Armor, Piercing, Sundered, resistência, HP temporário, **Discord** (dano contínuo + teste de Magic) e Stress.
- Ao chegar a 0 HP: **Wound**. O excesso é levado para o próximo HP e a tabela de Wound é rolada pela coluna de Wounds restantes. **Overstress** funciona igual, com a tabela de Overstress. Dazed, Staggered, Exposed e Lost Mana já são aplicados na ficha.
- NPC com Wound Cap 1 é derrotado no primeiro Wound. Com Overstress Cap 1, fica Vulnerable enquanto o Stress passa do cap.
- Custos automáticos ao usar habilidades: MP (Mana X), Focus (Focus X), Stressful X, usos Limited/Consumable, Reloading e Recharge. Spells são bloqueados quando o personagem está Silenced.

**Combate por fases**
- O tracker ordena por fase: 1 Bolster, 2 Channel, 3 Skirmish, 4 Reposition, 5 Brawl, 6 Release, 7 Full Attack, 8 Delay. Dentro de uma mesma fase, PCs vêm antes de NPCs.
- Ao "rolar iniciativa", um beacon escolhe a fase. NPCs usam a Iniciativa do tier.
- NPCs com mais de um turno (ex.: Elite) ganham combatentes extras (+5 de iniciativa por turno).
- Opcionalmente, a fase dos beacons é limpa a cada rodada (configuração do sistema).
- Botões de Surge (custo de Stress pelo nível de Surge), Defend (Focus = Armor + 1d3), Refresh, Limit Break (1 por quest), Short Rest e Long Rest.

**Régua e movimento**: distâncias em espaços, com diagonal custando 1 espaço (regra Equidistante do Foundry, aplicada automaticamente pelo GM). Ao arrastar um token, o trajeto fica verde até a Speed, amarelo até 2× a Speed (Rush) e vermelho além disso; Slowed remove o trecho amarelo e Immobilized deixa tudo vermelho. As duas opções podem ser desligadas nas configurações do sistema.

**Alcance de borda a borda**: Range e Reach são medidos entre os espaços ocupados mais próximos do atacante e do alvo, então tokens Size 2 e 3 contam a partir da borda e não do centro. No cartão de ataque, cada alvo mostra a distância e o alcance máximo da habilidade (ex.: `4/3 esp.`), com aviso de "Fora de alcance". Com um token selecionado, passar o mouse sobre outro mostra a distância. O tamanho do token no grid segue o Size da ancestralidade ou do NPC: 1/2 e 1 ocupam 1 espaço, 2 ocupa 2×2 e 3 ocupa 3×3.

**Condições e status**: Blinded, Dazed, Disarmed, Immobilized, Marked, Silenced, Slowed, Stunned, Sundered, Vulnerable, Weakened, Bloodied, Breaking, Engaged, Flying, Grappled, Hidden, Invisible e Prone. Bloodied e Breaking são aplicados automaticamente.

**NPCs**: cada NPC guarda os valores dos 3 tiers e a ficha usa os do tier escolhido. Nas habilidades, campos no formato `T1/T2/T3` (`+2/4/6`, `4/6/8`) são resolvidos pelo tier.

## Conteúdo (importação JSON)

O GM tem um botão **Importar BEACON** nas abas de Itens e Atores. Também pode usar a macro `game.beacon.openImporter()`. Cole um array JSON de documentos. Veja `examples/exemplo.json`.

### Campos por tipo

**ability** (armas, itens de suporte, spells, skills, traits, limit breaks, features de NPC)

| Campo | Valores |
|---|---|
| `category` | `weapon`, `support`, `spell`, `skill`, `trait`, `limitbreak` |
| `action` | `passive`, `minor`, `free`, `reaction`, `special`, `bolster`, `defend`, `refresh`, `channel`, `skirmish`, `mark`, `search`, `volley`, `reposition`, `hide`, `rush`, `brawl`, `fight`, `grapple`, `shove`, `release`, `fullattack`, `delay`, `ready` |
| `attack` | `none`, `melee`, `ranged`, `auto` |
| `defense` | `dodge`, `adef` (a tag Aetheric força `adef`) |
| `size` / `weaponType` | `light`/`main`/`heavy`; `artifact`/`blade`/`bow`/`club`/`longarm`/`magitech` |
| `tags`, `range` | texto livre (ex.: `"Aetheric, Mana 2"`, `"Range 10, Blast 2"`) |
| `damage`, `damageType` | fórmula (`"2d6+1"`, `"4/6/8"`); `physical`, `force`, `astral`, `lunar`, `discord`, `stress` |
| `attackBonus` | só NPC: `"+2/4/6"` |
| `memory`, `mana`, `focus`, `stressful`, `armor` | números |
| `usesType`, `uses` | `none`/`limited`/`consumable`, `{ "value": 1, "max": 1 }` |
| `reloading`, `recharge` | booleano; 0–6 (Recharge X+) |
| `equipped`, `free`, `npcFeature` | booleanos; `none`/`base`/`extra` |
| `rank`, `source`, `rarity`, `description` | rank da classe, origem, raridade, HTML |

**job**: `role`, `className`, `scope`, `saveTarget`, `hp`, `recoveries`, `dodge`, `speed`, `stressCap`, `memory`, `adef`, `mp`, `weaponSlots`, `supportSlots`, `traits` (HTML), `limitBreak: { name, range, description }`.

**class**: `rank` (0–3), `role`, `jobName`, `abilities` (HTML), `description`.

**talent**: `rank` (1–3), `rank1`/`rank2`/`rank3`: `{ name, description }`.

**ancestry**: `size` (`"0.5"`, `"1"`, `"2"`, `"3"`), `traits` (HTML).

**supply**: `quantity`, `cost`, `equipped`. **template**: `kind` (`mechanical`/`thematic`), `description`.

**npc** (Actor): `tier`, `role`, `npcType`, `size`, `turns`, `templates`, `tiers: { "1": {...}, "2": {...}, "3": {...} }` com `saveTarget`, `armor`, `scope`, `initiative`, `hp`, `stressCap`, `dodge`, `adef`, `speed`, `mp`, `bulk`, `agility`, `mind`, `magic`. As features vão em `items`.

## API para macros

`game.beacon.rolls` (rollD20, rollAbilityCheck, rollSkillCheck, rollAttack, postDamage), `actor.applyDamage(n, { type, piercing })`, `actor.applyStress(n)`, `actor.surge()`, `actor.defend()`, `actor.shortRest()`, `actor.longRest()` e `item.use()`. Arrastar uma habilidade da ficha para a hotbar cria uma macro de uso.
