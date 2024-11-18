
import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  Dimensions,
  Alert,
  Platform
} from 'react-native';

class Card {
    constructor(suit, rank, value) {
        this.suit = suit;
        this.rank = rank;
        this.value = value;
        this.points = this.calculatePoints();
    }

    calculatePoints() {
        const pointMap = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2 };
        return pointMap[this.rank] || 0;
    }

    toString() {
        const suitSymbols = {
            'hearts': '♥', 
            'diamonds': '♦', 
            'clubs': '♣', 
            'spades': '♠'
        };
        return `${this.rank}${suitSymbols[this.suit]}`;
    }

    compare(otherCard, trumpSuit) {
        const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades'];
        const rankOrder = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'];
        
        if (this.suit === trumpSuit && otherCard.suit !== trumpSuit) return 1;
        if (otherCard.suit === trumpSuit && this.suit !== trumpSuit) return -1;
        
        if (this.suit === otherCard.suit) {
            return rankOrder.indexOf(this.rank) - rankOrder.indexOf(otherCard.rank);
        }
        
        return suitOrder.indexOf(this.suit) - suitOrder.indexOf(otherCard.suit);
    }
}

export default function BalootGame() {
    const [game, setGame] = useState(null);
    const [modalVisible, setModalVisible] = useState(true);
    const [gameStatus, setGameStatus] = useState('جاهز للعب');
    const [currentPlayer, setCurrentPlayer] = useState('bottom');
    const [trick, setTrick] = useState([]);
    const [roundScores, setRoundScores] = useState({ 
        team1: 0, 
        team2: 0 
    });
    const [gameScores, setGameScores] = useState({
        team1: 0,
        team2: 0
    });

    // إعداد الدك وتوزيع البطاقات
    const createDeck = useCallback(() => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        return suits.flatMap(suit => 
            ranks.map((rank, index) => new Card(suit, rank, index))
        ).sort(() => Math.random() - 0.5);
    }, []);

    // تهيئة اللعبة
    const initializeGame = useCallback(() => {
        const deck = createDeck();
        const players = {
            bottom: deck.slice(0, 8),
            top: deck.slice(8, 16),
            left: deck.slice(16, 24),
            right: deck.slice(24, 32)
        };

        setGame({
            players,
            trumpSuit: null,
            currentRound: 1
        });

        setTrick([]);
        setModalVisible(true);
        setGameStatus('تم توزيع البطاقات. جاهز للإعلان');
    }, [createDeck]);

    // بداية اللعبة
    useEffect(() => {
        initializeGame();
    }, [initializeGame]);

    // معالجة اللعب الذكي للاعبين الآخرين
    const playAICard = useCallback((player) => {
        if (!game) return;

        const playerCards = game.players[player];
        if (playerCards.length === 0) return;

        // استراتيجية بسيطة للعب
        const cardIndex = Math.floor(Math.random() * playerCards.length);
        const card = playerCards[cardIndex];

        playCard(player, card);
    }, [game]);

    // معالجة اللعب
    const playCard = useCallback((player, card) => {
        // التحقق من صحة اللعب
        if (!game || player !== currentPlayer) {
            Alert.alert('خطأ', 'ليس دورك للعب');
            return;
        }

        // إضافة البطاقة للتريك الحالي
        const newTrick = [...trick, { player, card }];
        setTrick(newTrick);

        // إزالة البطاقة من يد اللاعب
        const updatedPlayers = {...game.players};
        updatedPlayers[player] = updatedPlayers[player].filter(c => c !== card);

        // تحديث اللعبة
        setGame({...game, players: updatedPlayers});

        // التبديل للاعب التالي
        const players = ['bottom', 'right', 'top', 'left'];
        const currentIndex = players.indexOf(currentPlayer);
        const nextPlayer = players[(currentIndex + 1) % 4];
        setCurrentPlayer(nextPlayer);

        // إذا اكتمل التريك
        if (newTrick.length === 4) {
            setTimeout(() => resolveCurrentTrick(newTrick), 1000);
        } else {
            // لعب الذكاء الاصطناعي
            if (nextPlayer !== 'bottom') {
                setTimeout(() => playAICard(nextPlayer), 500);
            }
        }
    }, [game, currentPlayer, trick, playAICard]);

    // حل التريك الحالي
    const resolveCurrentTrick = useCallback((currentTrick) => {
        const trumpSuit = game.trumpSuit;
        const winningTrick = currentTrick.reduce((best, current) => 
            current.card.compare(best.card, trumpSuit) > 0 ? current : best
        );

        // حساب النقاط
        const trickPoints = currentTrick.reduce((total, t) => total + t.card.points, 0);
        const winnerTeam = ['bottom', 'top'].includes(winningTrick.player) ? 'team1' : 'team2';

        // تحديث النقاط
        setRoundScores(prev => ({
            ...prev,
            [winnerTeam]: prev[winnerTeam] + trickPoints
        }));

        // إعادة ضبط التريك والتحديث
        setTrick([]);
        setCurrentPlayer(winningTrick.player);
        setGameStatus(`الفائز في التريك: ${winningTrick.player}`);

        // التحقق من انتهاء الجولة
        if (game.players.bottom.length === 0) {
            endRound();
        }
    }, [game]);

    // إنهاء الجولة
    const endRound = useCallback(() => {
        // حساب الفائز
        const winner = roundScores.team1 > roundScores.team2 ? 'team1' : 'team2';
        
        // تحديث النقاط الإجمالية
        setGameScores(prev => ({
            ...prev,
            [winner]: prev[winner] + 1
        }));

        // عرض النتيجة
        Alert.alert(
            'نهاية الجولة', 
            `الفريق ${winner === 'team1' ? '1' : '2'} فاز بالجولة!`
        );

        // إعادة تهيئة اللعبة
        initializeGame();
    }, [roundScores, initializeGame]);

    // معالجة الإعلان
    const handleDeclaration = useCallback((type, value) => {
        const updatedGame = {...game};
        
        switch(type) {
            case 'sun':
                updatedGame.trumpSuit = value;
                setGameStatus(`الصن: ${value}`);
                break;
            case 'hukm':
                updatedGame.trumpSuit = value;
                setGameStatus(`الحكم: ${value}`);
                break;
        }

        setGame(updatedGame);
        setModalVisible(false);

        // بدء اللعب بعد الإعلان
        setCurrentPlayer('bottom');
    }, [game]);

    // عرض البطاقات
    const renderCard = (card, index) => (
        <TouchableOpacity 
            key={index}
            style={styles.card}
            onPress={() => playCard('bottom', card)}
        >
            <Text style={styles.cardText}>{card.toString()}</Text>
        </TouchableOpacity>
    );

    // خيارات الإعلان
    const renderDeclarationOptions = () => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        return (
            <View>
                <Text style={styles.modalTitle}>اختر نوع الإعلان</Text>
                {['sun', 'hukm'].map((type) => (
                    <View key={type}>
                        <Text style={styles.declarationTypeTitle}>
                            {type === 'sun' ? 'الصن' : 'الحكم'}
                        </Text>
                        <View style={styles.suitContainer}>
                            {suits.map((suit) => (
                                <TouchableOpacity
                                    key={suit}
                                    style={styles.suitButton}
                                    onPress={() => handleDeclaration(type, suit)}
                                >
                                    <Text>{suit}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* لوحة النتائج */}
            <View style={styles.scoreBoard}>
                <Text style={styles.scoreBoardText}>الفريق 1: {gameScores.team1}</Text>
                <Text style={styles.scoreBoardText}>الفريق 2: {gameScores.team2}</Text>
            </View>

            {/* طاولة اللعب */}
            <View style={styles.gameTable}>
                {/* بطاقات اللاعبين */}
                <View style={styles.playerTopHand}>
                    <Text>{trick.filter(t => t.player === 'top').map(t => t.card.toString()).join(' ')}</Text>
                </View>
                <View style={styles.playerLeftHand}>
                    <Text>{trick.filter(t => t.player === 'left').map(t => t.card.toString()).join(' ')}</Text>
                </View>
                <View style={styles.playerRightHand}>
                    <Text>{trick.filter(t => t.player === 'right').map(t => t.card.toString()).join(' ')}</Text>
                </View>

                {/* بطاقات اللاعب السفلي */}
                <View style={styles.playerBottomHand}>
                    <FlatList
                        data={game?.players.bottom || []}
                        renderItem={({item, index}) => renderCard(item, index)}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal
                    />
                </View>

                {/* حالة اللعبة */}
                <Text style={styles.gameStatus}>{gameStatus}</Text>
            </View>

            {/* نافذة الإعلان */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {renderDeclarationOptions()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a2b3c',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 40 : 0
    },
    scoreBoard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginBottom: 10
    },
    scoreBoardText: {
        color: 'white',
        fontSize: 16
    },
    gameTable: {
        width: '90%',
        height: '70%',
        backgroundColor: '#2a5e3a',
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
        position: 'relative'
    },
    playerTopHand: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center'
    },
    playerLeftHand: {
        position: 'absolute',
        left: 20,
        top: '50%',
        transform: [{ rotate: '90deg' }]
    },
    playerRightHand: {
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: [{ rotate: '-90deg' }]
    },
    playerBottomHand: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center'
    },
    card: {
        width: 70,
        height: 100,
        backgroundColor: 'white',
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10
    },
    cardText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    gameStatus: {
        color: 'white',
        fontSize: 16,
        position: 'absolute',
        bottom: 5
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10
    },
    suitContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%'
    },
    suitButton: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 10
    },
    declarationTypeTitle: {
        textAlign: 'center',
        fontSize: 16,
        marginVertical: 10
    }
});
