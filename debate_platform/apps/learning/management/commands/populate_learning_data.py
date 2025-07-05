# apps/learning/management/commands/populate_learning_data.py
from django.core.management.base import BaseCommand
from learning.models import LearningCategory, LearningTopic

class Command(BaseCommand):
    help = 'Populate initial learning data for the debate platform'

    def handle(self, *args, **options):
        self.stdout.write('Creating learning categories and topics...')
        
        # Create Categories
        categories_data = [
            {
                'name': 'Argumentation Structure',
                'description': 'Learn how to build logical and persuasive arguments',
                'icon': 'target',
                'color': 'blue',
                'order': 1
            },
            {
                'name': 'Evidence and Research',
                'description': 'Master the art of finding and using credible sources',
                'icon': 'search',
                'color': 'green',
                'order': 2
            },
            {
                'name': 'Logical Fallacies',
                'description': 'Identify and avoid common reasoning errors',
                'icon': 'alert-triangle',
                'color': 'red',
                'order': 3
            },
            {
                'name': 'Rhetoric and Persuasion',
                'description': 'Develop compelling communication techniques',
                'icon': 'mic',
                'color': 'purple',
                'order': 4
            },
            {
                'name': 'Critical Thinking',
                'description': 'Analyze and evaluate arguments effectively',
                'icon': 'brain',
                'color': 'indigo',
                'order': 5
            }
        ]
        
        categories = {}
        for cat_data in categories_data:
            category, created = LearningCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            categories[cat_data['name']] = category
            if created:
                self.stdout.write(f'Created category: {category.name}')

        # Create Learning Topics
        topics_data = [
            # Beginner Level Topics
            {
                'category': 'Argumentation Structure',
                'title': 'What Makes a Strong Argument?',
                'description': 'Learn the basic components of effective arguments',
                'content': '''# What Makes a Strong Argument?

## Introduction
A strong argument is the foundation of effective debate and persuasion. Understanding the basic structure will help you communicate your ideas clearly and convincingly.

## Key Components

### 1. Clear Claim
Your argument should start with a clear, specific claim or thesis statement. This tells your audience exactly what you believe and want them to accept.

**Example:** "School uniforms should be mandatory in all public schools."

### 2. Supporting Evidence
Every claim needs evidence to back it up. This can include:
- Statistics and data
- Expert opinions
- Historical examples
- Personal experiences
- Scientific studies

### 3. Logical Reasoning
Connect your evidence to your claim with clear reasoning. Explain why your evidence supports your position.

### 4. Addressing Counterarguments
Acknowledge opposing viewpoints and explain why your position is stronger.

## Practice Exercise
Try building an argument about a topic you care about using these four components.
                ''',
                'difficulty_level': 'beginner',
                'estimated_duration': 15,
                'points_reward': 10
            },
            {
                'category': 'Argumentation Structure',
                'title': 'The Power of Examples',
                'description': 'Learn how to use examples effectively in your arguments',
                'content': '''# The Power of Examples

## Why Examples Matter
Examples make abstract concepts concrete and help your audience understand and remember your points.

## Types of Examples

### 1. Personal Anecdotes
Stories from your own experience can be powerful and relatable.

### 2. Historical Examples
Past events can provide context and precedent for your arguments.

### 3. Hypothetical Scenarios
"What if" scenarios help explore the implications of different positions.

### 4. Statistical Examples
Numbers and data provide concrete evidence for your claims.

## Best Practices
- Choose relevant examples
- Keep examples concise
- Use vivid, memorable details
- Connect examples clearly to your main point

## Practice
Think of three different types of examples you could use to support the argument "Exercise is important for student health."
                ''',
                'difficulty_level': 'beginner',
                'estimated_duration': 12,
                'points_reward': 10
            },
            {
                'category': 'Evidence and Research',
                'title': 'Finding Credible Sources',
                'description': 'Learn how to identify and evaluate reliable information sources',
                'content': '''# Finding Credible Sources

## What Makes a Source Credible?

### 1. Authority
- Who wrote or published the information?
- What are their qualifications?
- Are they recognized experts in the field?

### 2. Currency
- When was the information published?
- Is it recent enough to be relevant?
- Has it been updated?

### 3. Objectivity
- Is the source biased?
- Does it present multiple perspectives?
- Is it trying to sell something?

### 4. Accuracy
- Can you verify the information elsewhere?
- Are sources cited?
- Are there obvious errors?

## Reliable Source Types
- Peer-reviewed academic journals
- Government publications
- Established news organizations
- Educational institution websites
- Professional organizations

## Red Flags
- No author listed
- Extreme language or claims
- No sources cited
- Commercial bias
- Outdated information

## Practice
Find three credible sources about the benefits of renewable energy and evaluate them using these criteria.
                ''',
                'difficulty_level': 'beginner',
                'estimated_duration': 20,
                'points_reward': 15
            },
            {
                'category': 'Logical Fallacies',
                'title': 'Common Logical Fallacies',
                'description': 'Identify the most frequent reasoning errors in arguments',
                'content': '''# Common Logical Fallacies

## What Are Logical Fallacies?
Logical fallacies are errors in reasoning that make arguments invalid or weak. Learning to spot them helps you think more clearly and argue more effectively.

## Top 5 Fallacies to Know

### 1. Ad Hominem
Attacking the person making the argument instead of the argument itself.
**Example:** "You can't trust John's opinion on climate change because he's not a scientist."

### 2. Straw Man
Misrepresenting someone's argument to make it easier to attack.
**Example:** "People who support gun control want to take away all guns and leave us defenseless."

### 3. False Dilemma
Presenting only two options when more exist.
**Example:** "You're either with us or against us."

### 4. Appeal to Authority
Using an authority figure's opinion as evidence when they're not an expert in the relevant field.
**Example:** "This celebrity says this diet works, so it must be true."

### 5. Hasty Generalization
Drawing broad conclusions from limited examples.
**Example:** "I know two people from that city who were rude, so everyone there must be rude."

## How to Avoid Fallacies
- Question your assumptions
- Look for counterexamples
- Consider alternative explanations
- Check your evidence

## Practice
Can you identify the fallacies in these arguments?
1. "All teenagers are irresponsible because my neighbor's kid crashed his car."
2. "Either we ban all social media or society will collapse."
                ''',
                'difficulty_level': 'beginner',
                'estimated_duration': 18,
                'points_reward': 12
            },
            
            # Intermediate Level Topics
            {
                'category': 'Rhetoric and Persuasion',
                'title': 'The Art of Persuasion',
                'description': 'Master the classical techniques of persuasive communication',
                'content': '''# The Art of Persuasion

## Aristotle's Three Pillars

### 1. Ethos (Credibility)
Establish your trustworthiness and expertise.
- Demonstrate knowledge
- Show integrity
- Build rapport with your audience

### 2. Pathos (Emotional Appeal)
Connect with your audience's emotions.
- Use vivid language
- Tell compelling stories
- Appeal to values and beliefs

### 3. Logos (Logical Appeal)
Use clear reasoning and evidence.
- Present facts and statistics
- Use logical arguments
- Address counterarguments

## Modern Persuasion Techniques

### Reciprocity
People feel obligated to return favors.

### Social Proof
People follow what others are doing.

### Commitment and Consistency
People want to be consistent with their past actions.

### Scarcity
People value things that are rare or limited.

## Putting It All Together
The most persuasive arguments combine all three appeals appropriately for the audience and situation.

## Practice
Choose a position on a current issue and craft a short persuasive argument using ethos, pathos, and logos.
                ''',
                'difficulty_level': 'intermediate',
                'estimated_duration': 25,
                'points_reward': 20
            },
            {
                'category': 'Critical Thinking',
                'title': 'Analyzing Arguments',
                'description': 'Develop skills to evaluate the strength of any argument',
                'content': '''# Analyzing Arguments

## The CRAAP Test

### Currency
- How recent is the information?
- Is it updated regularly?
- Are the links functional?

### Relevance
- Does it relate to your topic?
- Is it at an appropriate level?
- Would you be comfortable citing this?

### Authority
- Who is the author/publisher?
- What are their credentials?
- Is there contact information?

### Accuracy
- Where does the information come from?
- Is it supported by evidence?
- Can you verify it elsewhere?

### Purpose
- Why was this information published?
- Is it objective or biased?
- Is it fact, opinion, or propaganda?

## Argument Structure Analysis

### 1. Identify the Main Claim
What is the author trying to prove?

### 2. Find the Supporting Premises
What evidence supports the claim?

### 3. Look for Hidden Assumptions
What unstated beliefs does the argument rely on?

### 4. Evaluate the Logic
Do the premises actually support the conclusion?

### 5. Consider Alternative Explanations
Are there other ways to interpret the evidence?

## Red Flags in Arguments
- Emotional language instead of evidence
- Oversimplification of complex issues
- Cherry-picking data
- False analogies
- Correlation presented as causation

## Practice Exercise
Find an opinion article online and analyze it using these techniques. What are its strengths and weaknesses?
                ''',
                'difficulty_level': 'intermediate',
                'estimated_duration': 30,
                'points_reward': 25
            }
        ]

        for topic_data in topics_data:
            category = categories[topic_data.pop('category')]
            topic_data['category'] = category
            
            topic, created = LearningTopic.objects.get_or_create(
                title=topic_data['title'],
                defaults=topic_data
            )
            if created:
                self.stdout.write(f'Created topic: {topic.title}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {LearningCategory.objects.count()} categories '
                f'and {LearningTopic.objects.count()} topics'
            )
        )
