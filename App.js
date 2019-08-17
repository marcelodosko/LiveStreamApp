import React, { Component } from 'react';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStream,
    MediaStreamTrack,
    mediaDevices
} from 'react-native-webrtc';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Button,
    Alert
} from 'react-native';

class App extends Component {
    // Initial state
    constructor(props) {
    super(props);
    this.state = { 
      username: 'A',
      connection: null,
      ws: new WebSocket('ws://192.168.0.31:3501'),
      otherUsername: null,
      login:false,
      channel: null,
      jsonName: '',
      countMsg: 2,
      testType: '',
    };
  }

  componentWillMount() {
    const { ws } = this.state
    console.log('ws', ws)
    
    ws.onopen = () => {
      console.log('Connected to the signaling server')
    }

    ws.onerror = err => {
      console.error('ws.onerror', err)
    }

    ws.onmessage = msg => {
      console.log('Got message', msg.data)

      const data = JSON.parse(msg.data)

      switch (data.type) {
        case 'login':
          this.handleLogin(data.success)
          break
        case 'offer':
          this.handleOffer(data.offer, data.username)
          break
        case 'answer':
          this.handleAnswer(data.answer)
          break
        case 'candidate':
          this.handleCandidate(data.candidate)
          break
        case 'setCantMjes':
          this.setState({ countMsg: parseInt(data.cantMjes), testType: 'websocket'})
          break
        case 'loremIpsum':
          const { countMsg } = this.state
          this.setState({ countMsg: countMsg - 1})
          break
        case 'close':
          this.handleClose()
          break
        default:
          break
      }
    }
  }

  sendMessage = message => {
    const { ws, otherUsername } = this.state

    if (otherUsername) {
      message.otherUsername = otherUsername
    }

    ws.send(JSON.stringify(message))
  }

  login = () => {
    const { username } = this.state
    if (username !== '') {
      this.sendMessage({
        type: 'login',
        username
      })
    }
  }

  handleLogin = async success => {
    if (success === false) {
      Alert.alert('error','😞 Username already taken')
    } else {

      const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
      const connection = new RTCPeerConnection(configuration, { optional: [{ RtpDataChannels: true}] });
      console.log('new RTCPeerConnection connection', connection)
      this.setState({ connection, login: success })
      
      const channel = connection.createDataChannel('RtpDataChannels')
                this.setState({ channel })

      connection.ondatachannel = event => {
        event.channel.onmessage = event => {
          if (event.data.length < 10 ) this.setState({ countMsg: parseInt(event.data), testType: 'webrtc'})
          const { countMsg } = this.state
          this.setState({ countMsg: countMsg - 1})
        };

        event.channel.onopen = event => {
          console.log('event.channel.onopen', event)
            // channel.send('RTCDataChannel opened.', event);
        };
        
        event.channel.onclose = event => {
            console.log('RTCDataChannel closed.', event);
        };
        
        event.channel.onerror = event => {
            console.error('event.channel.onerror', event);
        };
      }

        connection.onicecandidate = (event) => {
          console.log('iceCandidate', event.candidate)
            if (event.candidate) {
            this.sendMessage({
              type: 'candidate',
              candidate: event.candidate
            })
          }
        };
      }
  }
  
  callOtherUser = () => {
    const { connection } = this.state
    connection.createOffer().then(
    offer => {
      this.sendMessage({
        type: 'offer',
        offer: offer
      })
      connection.setLocalDescription(offer)
    });
  }

  handleOffer = (offer, username) => {
    const { connection } = this.state
    this.setState({ otherUsername: username })
    connection.setRemoteDescription(new RTCSessionDescription(offer))
    connection.createAnswer().then(
      answer => {
        connection.setLocalDescription(answer)
        this.sendMessage({
          type: 'answer',
          answer: answer
        })
      },
      error => {
        alert('Error when creating an answer')
        console.error('createAnswer error', error)
      }
    )
  }

  handleAnswer = answer => {
    const { connection } = this.state
    connection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  handleCandidate = candidate => {
    const { connection } = this.state
    connection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  handleClose = () => {
    const { connection } = this.state
    this.setState({ otherUsername: null })
    connection.close()
    connection.onicecandidate = null
    connection.onaddstream = null
  }

  getJson = () => {
    const { jsonName, channel } = this.state
    channel.send(jsonName)
  }

  stopAdb = () => {
    const { ws, testType } = this.state
    ws.send(JSON.stringify({type: 'stopADB', testType}))
  }

  startTest = () => {
    const { ws } = this.state
    ws.send(JSON.stringify({type: 'startTestWebSocket'}))
  }

  render() {
    const { login, countMsg } = this.state
    if (countMsg === 0) this.stopAdb()
    return (
      <View style={styles.container}>
        { !login ?
          (
            <View style={styles.containerButton}>
              <Button
                onPress={this.login}
                title="login"
                color="#841584"
              />
            </View>
          ) : (
            <View>
              <Text style={styles.welcome}>connect with peer!</Text>
              <TextInput
                style={{height: 40, width: 250, borderColor: 'gray', borderWidth: 1}}
                onChangeText={otherUsername => this.setState({otherUsername})}
                value={this.state.otherUsername}
              />
              <Text style={styles.welcome}>Countdown</Text>
              <Text style={styles.welcome}>{countMsg}</Text> 
              <View style={styles.containerButton}>
                <Button
                  onPress={this.startTest}
                  title="Start Test WebSocket"
                  color="#841584"
                />
              </View>
            </View>
          )
        }
        <Text style={styles.welcome}>{this.state.messageR}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  containerButton: {
    width: 200,
    height: 200,
  }
});

export default App;
