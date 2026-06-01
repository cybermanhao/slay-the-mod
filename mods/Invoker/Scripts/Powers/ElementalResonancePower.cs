using Invoker.Scripts.Cards;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 元素共鸣 — 每回合开始将一张虚无「祈唤」加入手牌。
/// Amount = 1: 普通版（祈唤费用 1）；Amount = 0: 升级版（祈唤费用 0）。
/// </summary>
public class ElementalResonancePower : InvokerPower
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner.Player) return;
        Flash();

        var card = CombatState!.CreateCard(ModelDb.Card<InvokeCard>(), player);

        // Amount == 0 means upgraded: generated Invoke card is free
        if (Amount == 0)
            card.EnergyCost.SetThisCombat(0);

        CardCmd.ApplyKeyword(card, CardKeyword.Ethereal);
        await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, player);
    }
}
