# Projet Dev Logiciel 


## Sujet

Serveur de matchmaking 





## Technos utilisés  
nodeJS (back)
React (front)




## Fonctionnalités : 

- Modèle de données 
	- une file d’attente, contenant pour chaque attendant : Difficulté : 1
		- le moyen de communiquer avec lui (IP et port par exemple)
		- un pseudo
		- la date à laquelle il est entrée dans la file


- des matchs, contenant pour chacun : Difficulté : 1
	- le moyen de communiquer avec le joueur 1
	- le moyen de communiquer avec le joueur 2
	- le plateau de jeu
	- si le match est fini
	- s'il y a eu victoire du joueur 1, du joueur 2 ou égalité


- des tours, contenant pour chacun : Difficulté : 1
	- la liaison avec le match
	- qui a joué : le joueur 1 ou le joueur 2
	- l’information du coup joué (en fonction du jeu choisi)


-	le serveur de Matchmaking contient :
	- le lien avec la base de données Difficulté : 3
	- un système de socket avec les actions suivantes : Difficulté : 5
		- arrivé d’un client dans la file d’attente (réception)
		- début d’un match (envoie)
		- réception d’un tour (réception puis envoie)
		- fin d’un match (envoie)
	- une vérification constante de la file d’attente et création de matchs en fonction Difficulté : 2
	- une logique de jeu. Vous êtes libre quant au choix du jeu. Cela doit cependant
	- être un jeu de plateau au tour par tour (Ex : puissance 4, dames, morpion, ...) Difficulté : 5


- le logiciel client contient :
	- un système de socket avec les actions suivantes : Difficulté : 5
		- entrée en file d’attente (envoie)
		- début d’un match (réception)
		- jouer un coup (envoie)
		- prendre en compte le coup adverse (réception)
		- fin d’un match (réception)
	- une partie de la logique du jeu choisis. Difficulté : 2


- soit : Difficulté : 3
		- une IHM pour pouvoir jouer
		- une CLI avec IA



### Liens utiles : 


https://github.com/euoia/node-games-lobby

https://github.com/endel/colyseus-tic-tac-toe


https://modernweb.com/building-multiplayer-games-with-node-js-and-socket-io/

https://www.codementor.io/@codementorteam/socketio-multi-user-app-matchmaking-game-server-2-uexmnux4p


