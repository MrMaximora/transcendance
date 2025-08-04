import { Card } from './card.js';
import * as math from "mathjs";

export class gameBoard {

    private drawPile: Card[] = [];

    constructor() {
        this.shufflingCards();
    }

    private shufflingCards() {
        for (var number = 0, id = 0; id < 4; number++)
        {
            var tmp:Card = new Card(id, number);
            var random:number = math.round(math.random() * (32 - 0) + 0);
            while (this.drawPile[random])
            {
                if (random == 31)
                    random = 0
                else
                    random++;
            }
            // console.log(`${random} = ${id}.${number}`);
            this.drawPile[random] = tmp;
            if (id == 0 && number == 1)
                number = -1, id++;
            if (id > 0 && number == 9)
                number = -1, id++;
        }
    }

    public getCard(id:number):number {

        return ((this.drawPile[id].getType()*100) + this.drawPile[id].getNumber()) as number;
    }
}